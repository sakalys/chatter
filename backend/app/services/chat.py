from asyncio import constants
from datetime import datetime
import json
import logging
from re import S
from typing import Any, AsyncGenerator, Literal, Union
from uuid import UUID
from google import genai
from google.genai import types
from openai import AsyncOpenAI # Import AsyncOpenAI

from fastapi import HTTPException, status
from sse_starlette.sse import EventSourceResponse
from mcp import ClientSession
from mcp.client.sse import sse_client

from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.mcp_config import MCPConfig
from app.models.mcp_tool import MCPTool
from app.models.message import Message
from app.schemas.message import MessageCreate, ToolUseCreate
from app.models.user import User # Import User model
from app.services.api_key import decrypt_api_key
from app.services.conversation import add_message_to_conversation, get_conversation_by_id, get_conversation_by_id_and_user_id, update_conversation
from app.schemas.conversation import ConversationCreate, ConversationUpdate

logger = logging.getLogger(__name__) # Get logger

class StreamEvent:
    """
    Class to represent a streaming event.
    """
    event: str
    data: str

    def __init__(self, event: Union[Literal["text"], Literal["function_call"]], data: str):
        self.event = event
        self.data = data

    def __str__(self):
        return f"Event: {self.event}, Data: {self.data}"


async def _generate_google_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    mcp_tools: list[MCPTool],
) -> AsyncGenerator[StreamEvent, None]:
    """
    Generate a chat response from the Google API.

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted Google API key

    Returns:
        Response from the Google API
    """

    tools: list[types.Tool] = [
        types.Tool(
            function_declarations=[
                {
                    # "id": str(tool.id), # does not work
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        k: v
                        for k, v in tool.inputSchema.items()
                        if k not in ["additionalProperties", "$schema"]
                    },
                }
            ]
        )
        for tool in mcp_tools
    ]

    # Format messages for Google's API
    formatted_messages: list[Any] = []
    for msg in messages:
        if "content" in msg:
            if msg["role"] == "user":
                formatted_messages.append({"role": "user", "parts": [{"text": msg["content"]}]})
            elif msg["role"] == "assistant":
                formatted_messages.append({"role": "model", "parts": [{"text": msg["content"]}]})
            elif msg["role"] == "system":
                formatted_messages.append({"role": "user", "parts": [{"text": f"System: {msg['content']}"}]})
        else:
            logger.warning(f"Message missing 'content' key: {msg}")

    client = genai.Client(api_key=api_key)

    async for chunk in await client.aio.models.generate_content_stream(
        # model="gemini-2.0-flash-001",
        model=model,
        contents=formatted_messages,
        config={
            "tools": tools,
        },
    ):
        if chunk.candidates[0].content.parts[0].function_call:
            function_call = chunk.candidates[0].content.parts[0].function_call

            yield StreamEvent("function_call", json.dumps(function_call.model_dump()))

            continue
            # # Call the MCP server with the predicted tool
            # result = await session.call_tool(
            #     function_call.name, arguments=function_call.args
            # )
            # print(result.content[0].text)
            # Continue as shown in step 4 of "How Function Calling Works"
            # and create a user friendly response

        yield StreamEvent("text", chunk.text if chunk.text else "")

    return

async def _generate_openai_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    mcp_tools: list[MCPTool],
) -> AsyncGenerator[StreamEvent, None]:
    """
    Generate a chat response from the OpenAI API using the SDK, including tool definitions.

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted OpenAI API key

    Returns:
        Streaming response from the OpenAI API
    """
    # Convert MCP tools to OpenAI tools format
    tools = []
    for tool in mcp_tools:
        openai_tool = {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    k: v
                    for k, v in tool.inputSchema.items()
                    if k not in ["additionalProperties", "$schema"]
                },
            },
        }
        tools.append(openai_tool)

    client = AsyncOpenAI(api_key=api_key)

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        tools=tools, # Pass the formatted tools
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content

async def generate_chat_response(
    user: User, # Added user parameter
    messages: list[dict[str, str]], # Changed type hint to match _generate functions
    model: str,
    api_key: str,  # Changed to expect decrypted key string
    provider: str,  # Added provider parameter
) -> AsyncGenerator[StreamEvent, None]:
    """
    Generate a chat response from an LLM provider.
    
    Args:
        conversation: Conversation object
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted API key string
        provider: Provider name (openai, anthropic, or google)
        
    Returns:
        Response from the LLM provider or streaming response object
    """
    
    all_mcp_tools: list[MCPTool] = []

    configs: list[MCPConfig] = await user.awaitable_attrs.mcp_configs

    for config in configs:
        all_mcp_tools.extend(await config.awaitable_attrs.tools)

    if provider == "google":
        response = _generate_google_response(messages, model, api_key, all_mcp_tools)
        return response
    elif provider == "openai":
        response = _generate_openai_response(messages, model, api_key, all_mcp_tools) # Pass mcp_tools to OpenAI function
        return response

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported LLM provider: {provider}",
    )

async def handle_chat_request(
    db,
    user: User,
    user_message: str,
    model: str,
    api_key: ApiKey,
    conversation_id: UUID | None = None,
) -> Any:
    """
    Handle a chat request.
    
    Args:
        db: Database session
        user_id: ID of the current user
        conversation_id: Optional Conversation ID. If not provided, a new conversation will be created.
        user_message: User message
        model: Model to use for generation
        api_key: API key to use for the request
        
        Returns:
            Response from the LLM provider or SSE response, including the conversation ID
    """
    logger.debug(f"Handling chat request for user: {user.id}, conversation: {conversation_id}") # Log handling request
    
    is_new_conversation = conversation_id is None

    # If no conversation_id is provided, create a new conversation
    if is_new_conversation:
        from app.services.conversation import create_conversation
        conversation = await create_conversation(db, ConversationCreate(), user.id)
        conversation_id = conversation.id
        logger.debug(f"Created new conversation with ID: {conversation_id}") # Log new conversation
    else:
        # Get conversation to ensure it exists and belongs to the user
        conversation = await get_conversation_by_id_and_user_id(db, conversation_id, user.id)
        if not conversation:
            logger.error(f"Conversation not found for ID: {conversation_id}") # Log error
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

    # Add user message to conversation
    await add_message_to_conversation(
        db,
        MessageCreate(
            role="user",
            content=user_message,
        ),
        conversation
    )
    logger.debug(f"Added user message to conversation: {conversation.id}") # Log adding user message
    
    # Get all messages in the conversation
    from app.services.conversation import get_messages_by_conversation
    messages = await get_messages_by_conversation(db, conversation.id)
    logger.debug(f"Retrieved {len(messages)} messages for conversation: {conversation.id}") # Log retrieving messages

    # Format messages for the provider
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "role": msg.role,
            "content": msg.content
        })

    try:
        logger.debug("Calling generate_chat_response") # Log before calling generation
        # Decrypt the API key before passing it to generate_chat_response
        decrypted_key = decrypt_api_key(api_key.key_reference)
        logger.debug(f"Decrypted API key (first 5 chars): {decrypted_key[:5]}...") # Log first 5 chars of decrypted key
        
        # Generate response - pass the formatted messages list
        response = await generate_chat_response(
            user=conversation.user, # Pass the user object
            messages=formatted_messages,
            model=model,
            api_key=decrypted_key,  # Pass the decrypted key directly
            provider=api_key.provider,  # Pass the provider separately
        )
        logger.debug(f"Finished generate_chat_response. Response type: {type(response)}") # Log after calling generation and response type
            
        async def event_generator():
            # If it's a new conversation, send an initial event with the conversation ID

            if is_new_conversation:
                logger.debug(f"Sending initial conversation_id event: {conversation.id}")
                yield {
                    "event": "conversation_created",
                    "data": str(conversation.id)
                }

            tool_calls = []

            content = ""
            async for event in response:
                if event.event == "function_call":
                    # Handle function call event
                    logger.debug(f"Function call event: {event.data}")
                    data = json.loads(event.data)
                    tool_calls.append(data)

                    yield {
                        "event": "function_call",
                        "data": event.data
                    }

                elif event.event == "text":
                    # Handle text event
                    content += event.data

                    yield {
                        "event": "message",
                        "data": event.data
                    }
                else:
                    logger.warning(f"Unknown event type: {event.event}")

            await add_message_to_conversation(
                db,
                MessageCreate(
                    role="assistant",
                    content=content,
                    model=model,
                    meta={"provider": api_key.provider},
                ),
                conversation
            )

            for tool_call in tool_calls:
                # fetch the user's MCP tool from db
                # the mcp config must belong to the user
                # and the tool must belong to the mcp config
                mcp_tool: MCPTool | None = None
                for config in await user.awaitable_attrs.mcp_configs:
                    for tool in await config.awaitable_attrs.tools:
                        if tool.name == tool_call["name"]:
                            mcp_tool = tool
                            break
                    if mcp_tool:
                        break

                if not mcp_tool:
                    logger.error(f"MCP Tool not found for function call: {tool_call}")
                    continue

                await add_message_to_conversation(
                    db,
                    MessageCreate(
                        role="function_call",
                        content=json.dumps({"name": tool_call["name"], "arguments": tool_call["args"]}),
                        model=model,
                        meta={"provider": api_key.provider},
                        tool_use=ToolUseCreate(
                            name=tool_call["name"],
                            args=tool_call["args"],
                        )
                    ),
                    conversation,
                    mcp_tool,
                )

                # mcp_config: MCPConfig = await mcp_tool.awaitable_attrs.mcp_config

                # # call the tool
                # async with sse_client(mcp_config.url) as streams:
                #     async with ClientSession(*streams) as session:
                #         await session.initialize()

                #         result = await session.call_tool(
                #             tool_call["name"], arguments=tool_call["args"]
                #         )

                #         print(result)


            # Generate and set conversation title after the first response
            if is_new_conversation and content:
                generated_title = await generate_and_set_conversation_title(
                    db=db,
                    user=user,
                    conversation=conversation,
                    user_message=user_message,
                    assistant_message=content,
                    api_key=decrypted_key,
                    provider=api_key.provider,
                    model=model
                )
                if generated_title:
                    logger.debug(f"Sending conversation_title_updated event: {generated_title}")
                    yield {
                        "event": "conversation_title_updated",
                        "data": generated_title
                    }

            yield {
                "event": "done",
                "data": ""
            }

        return EventSourceResponse(event_generator())

    except Exception as e:
        # Log the error with traceback and return an HTTPException
        import traceback
        logger.error(f"Error generating chat response: {e}", exc_info=True) # Log error with traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating chat response: {e}"
        )

async def generate_and_set_conversation_title(
    db,
    user: User,
    conversation: Conversation,
    user_message: str,
    assistant_message: str,
    api_key: str,
    provider: str,
    model: str,
) -> str:
    """
    Generates a title for the conversation based on the initial message and response,
    updates the conversation in the database, and sends an SSE event to the frontend.
    """
    logger.debug(f"Generating title for conversation: {conversation.id}")

    # Construct prompt for title generation
    prompt = f"Generate a short, concise title (under 10 words) for the following conversation based on the user's initial message and the assistant's response:\n\nUser: {user_message}\nAssistant: {assistant_message}\n\nTitle:"

    title = ''
    try:
        generator = await generate_chat_response(
            user,
            messages=[
                {"role": "user", "content": prompt}
            ],
            model=model,
            api_key=api_key,
            provider=provider,
        )

        async for title_part in generator:
            title += title_part.data

        if title:
            await update_conversation(db, conversation, ConversationUpdate(title=title))

    except Exception as e:
        logger.error(f"Error generating or setting conversation title: {e}", exc_info=True)
        # Don't raise an exception here, title generation is not critical

    return title

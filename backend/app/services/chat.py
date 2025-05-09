import json
import logging
from re import S
from typing import Any, AsyncGenerator, Literal, Union
from uuid import UUID
from app.models.mcp_tool_use import MCPToolUse, ToolUseState
from litellm import CustomStreamWrapper, acompletion

from fastapi import HTTPException, status
import litellm
from openai import AuthenticationError
from sse_starlette.sse import EventSourceResponse
from mcp import ClientSession
from mcp.client.sse import sse_client
from mcp.types import TextContent
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.mcp_config import MCPConfig
from app.models.mcp_tool import MCPTool
from app.schemas.message import MessageCreate, ToolUseCreate
from app.models.user import User # Import User model
from app.services.api_key import decrypt_api_key
from app.services.conversation import add_message_to_conversation, get_messages_by_conversation, get_conversation_by_id_and_user_id, update_conversation
from app.schemas.conversation import ConversationCreate, ConversationUpdate, MessageResponse

logger = logging.getLogger(__name__) # Get logger

class StreamEvent:
    """
    Class to represent a streaming event.
    """
    event: str
    data: str

    def __init__(self, event: Union[Literal["text"], Literal["function_call"], Literal["auth_error"]], data: str):
        self.event = event
        self.data = data

    def __str__(self):
        return f"Event: {self.event}, Data: {self.data}"

class FunctionCall(BaseModel):
    """
    Class to represent a function call event.
    """
    name: str
    arguments: dict[str, Any] | None

    def __str__(self):
        return f"FunctionCall(name={self.name}, arguments={self.arguments})"

def _format_mcp_tools_for_openai(mcp_tools: list[MCPTool]) -> list[dict[str, Any]]:
    """
    Converts a list of MCPTool objects to the OpenAI tools format.
    Also cleans up the parameters by replacing "format": "uri" with "format": "string" for string types.
    """
    tools = []
    for tool in mcp_tools:
        function_parameters = {
            k: v
            for k, v in tool.inputSchema.items()
            if k not in ["additionalProperties", "$schema"]
        }

        properties = function_parameters["properties"] or {}

        cleaned_properties = properties.copy()

        for property_name, property_schema in cleaned_properties.items():
            cleaned_property_schema = property_schema.copy()
            if isinstance(property_schema, dict):

                # see https://spec.openapis.org/oas/v3.0.3#schema
                # see https://github.com/lastmile-ai/mcp-agent/issues/93
                if property_schema.get("type") == "string" and property_schema.get("format") == "uri":
                    del cleaned_property_schema["format"]

            cleaned_properties[property_name] = cleaned_property_schema
        
        function_parameters['properties'] = cleaned_properties

        openai_tool = {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": function_parameters,
            },
        }
        tools.append(openai_tool)

    return tools

async def _generate_litellm_response(
    provider: str,
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    mcp_tools: list[MCPTool],
) -> AsyncGenerator[StreamEvent, None]:
    """
    Generate a chat response

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation

    Returns:
        Streaming response
    """

    # Convert MCP tools to OpenAI tools format
    tools = _format_mcp_tools_for_openai(mcp_tools)

    formatted_messages: list[Any] = []
    formatted_messages.append( {
        "role": "system",
        "content": "Remember... If a question is unrelated to functions provided to you, use your intrinsic knowledge to anwer the question.",
    })
    for msg in messages:
        if "content" in msg:
            if msg["role"] == "user":
                formatted_messages.append({"role": "user", "content": msg["content"]})
            elif msg["role"] == "assistant":
                formatted_messages.append({"role": "assistant", "content": msg["content"]})
            elif msg["role"] == "system":
                formatted_messages.append({"role": "user", "content": f"System: {msg['content']}"})
            elif msg["role"] == "function_call":
                formatted_messages.append({"role": "assistant", "content": f"""
<tool_call>
    {msg['content']}
</tool_call>
"""})
            elif msg["role"] == "function_call_result":
                formatted_messages.append({"role": "assistant", "content": f"""
<tool_call_response>
    {msg['content']}
</tool_call_response>
"""})

    litellm.drop_params = True

    try:
        stream = await acompletion(
            stream=True,
            model=provider+"/"+model,
            messages=formatted_messages,
            tools=tools,
            api_key=api_key,
            parallel_tool_calls=False,
        )

        unfinished_call = None
        
        if not isinstance(stream, CustomStreamWrapper):
            raise

        async for chunk in stream:
            if not chunk.choices or not chunk.choices[0].delta:
                continue

            delta = chunk.choices[0].delta

            if delta.tool_calls:
                tool_call = delta.tool_calls[0]

                # having an id, indicates a new function call
                if tool_call.id is not None:
                    if unfinished_call is not None:
                        # if we have an incomplete call, we need to yield it
                        call = FunctionCall(
                            name=unfinished_call["name"],
                            arguments=json.loads(unfinished_call["arguments"]),
                        )
                        yield StreamEvent("function_call", json.dumps(call.model_dump()))

                    unfinished_call = {
                        "name": "",
                        "arguments": "",
                    }

                function_call = tool_call.function

                if function_call is not None:
                    if unfinished_call is None:
                        raise ValueError("Previous buffered call must be set before accessing function_call")

                    if function_call.name:
                        unfinished_call["name"] = function_call.name

                    unfinished_call["arguments"] += function_call.arguments or ""
            
            if delta.content is not None:
                yield StreamEvent("text", delta.content)

        if unfinished_call is not None and unfinished_call["name"] != "":
            call = FunctionCall(
                name=unfinished_call["name"],
                arguments=json.loads(unfinished_call["arguments"]),
            )
            yield StreamEvent("function_call", json.dumps(call.model_dump()))
            unfinished_call = None
    except AuthenticationError:
        yield StreamEvent("auth_error", "")

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
        provider: Provider name (openai, anthropic, gemini, etc)
        
    Returns:
        Response from the LLM provider or streaming response object
    """
    
    all_mcp_tools: list[MCPTool] = []

    configs: list[MCPConfig] = await user.awaitable_attrs.mcp_configs

    for config in configs:
        all_mcp_tools.extend(await config.awaitable_attrs.tools)

    response = _generate_litellm_response(provider, messages, model, api_key, all_mcp_tools) # Pass mcp_tools to OpenAI function
    return response

async def handle_chat_request(
    db,
    user: User,
    user_message: str,
    model: str,
    api_key: ApiKey,
    conversation_id: UUID | None = None,
    tool_decision: bool | None = None,
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
    logger.debug(f"Handling chat request for user: {user.id}, conversation: {conversation_id}")
    
    is_new_conversation = conversation_id is None

    # If no conversation_id is provided, create a new conversation
    if is_new_conversation:
        from app.services.conversation import create_conversation
        conversation = await create_conversation(db, ConversationCreate(), user.id)
        conversation_id = conversation.id
        logger.debug(f"Created new conversation with ID: {conversation_id}")
    else:
        # Get conversation to ensure it exists and belongs to the user
        conversation = await get_conversation_by_id_and_user_id(db, conversation_id, user.id)
        if not conversation:
            logger.error(f"Conversation not found for ID: {conversation_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

    created_user_message_id: str | None = None

    if tool_decision is None:
        msg = await add_message_to_conversation(
            db,
            MessageCreate(
                role="user",
                content=user_message,
                model=model,
                provider=api_key.provider,
            ),
            conversation
        )

        created_user_message_id = str(msg.id)
        logger.debug(f"Added user message to conversation: {conversation.id}")
    
    # Get all messages in the conversation
    messages = await get_messages_by_conversation(db, conversation.id)
    logger.debug(f"Retrieved {len(messages)} messages for conversation: {conversation.id}")


    # Format messages for the provider
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "role": msg.role,
            "content": msg.content
        })

    if tool_decision is not None and len(messages) and messages[-1].role == "function_call":
        logger.debug("Handling tool decision")

        tool_use = messages[-1].mcp_tool_use
        if tool_use == None:
            raise

        response_text = await handle_tool_call(
            db,
            tool_use,
            tool_decision,
            model,
            api_key,
            conversation,
        )

        formatted_messages.append({
            "role": "function_call_result",
            "content": response_text,
        })

    try:
        logger.debug("Calling generate_chat_response")
        # Decrypt the API key before passing it to generate_chat_response
        decrypted_key = decrypt_api_key(api_key.key_reference)
        
        # Generate response - pass the formatted messages list
        response = await generate_chat_response(
            user=conversation.user, # Pass the user object
            messages=formatted_messages,
            model=model,
            api_key=decrypted_key,  # Pass the decrypted key directly
            provider=api_key.provider,  # Pass the provider separately
        )
            
        async def event_generator():
            if created_user_message_id:
                yield {
                    "event": "user_message_id",
                    "data": created_user_message_id
                }

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
                if event.event == "auth_error":
                    yield {
                        "event": "auth_error",
                        "data": ""
                    }

                elif event.event == "function_call":
                    # Handle function call event
                    logger.debug(f"Function call event: {event.data}")
                    data = json.loads(event.data)
                    tool_calls.append(data)

                elif event.event == "text":
                    # Handle text event
                    content += event.data

                    yield {
                        "event": "message",
                        "data": event.data
                    }
                else:
                    logger.warning(f"Unknown event type: {event.event}")

            if content != "":
                created = await add_message_to_conversation(
                    db,
                    MessageCreate(
                        role="assistant",
                        content=content,
                        model=model,
                        provider=api_key.provider,
                    ),
                    conversation
                )

                yield {
                    "event": "message_done",
                    "data": MessageResponse.model_validate(created, from_attributes=True).model_dump_json(by_alias=True)
                }

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

                message = await add_message_to_conversation(
                    db,
                    MessageCreate(
                        role="function_call",
                        content=json.dumps({"name": tool_call["name"], "arguments": tool_call["arguments"]}),
                        model=model,
                        provider=api_key.provider,
                        tool_use=ToolUseCreate(
                            name=tool_call["name"],
                            args=tool_call["arguments"],
                        )
                    ),
                    conversation,
                    mcp_tool,
                )

                yield {
                    "event": "function_call",
                    "data": MessageResponse.model_validate(message, from_attributes=True).model_dump_json(by_alias=True)
                }


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
        logger.error(f"Error generating chat response: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating chat response: {e}"
        )

async def handle_tool_call(db: AsyncSession, tool_use: MCPToolUse, tool_decision: bool, model: str, api_key: ApiKey, conversation: Conversation) -> str:
    mcp_tool: MCPTool = await tool_use.awaitable_attrs.tool

    mcp_config: MCPConfig = await mcp_tool.awaitable_attrs.mcp_config

    tool_use.state = ToolUseState.approved if tool_decision else ToolUseState.rejected
    db.add(tool_use)
    await db.commit()

    # call the tool
    async with sse_client(mcp_config.url) as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()

            result = await session.call_tool(
                tool_use.name,
                arguments=tool_use.args
            )

            response_text = ""
            if result and result.content:
                for content_item in result.content:
                    # Explicitly check if the content_item is a text content type
                    # Assuming TextContent is a valid type in the mcp library
                    if isinstance(content_item, TextContent) and content_item.text is not None:
                         response_text += content_item.text
                    # You might want to handle other content types here if necessary
                    # elif isinstance(content_item, ImageContent) and content_item.image_url is not None:
                    #     response_text += f"[Image: {content_item.image_url}]"
                    # elif isinstance(content_item, ResourceContent) and content_item.resource_url is not None:
                    #     response_text += f"[Resource: {content_item.resource_url}]"


            await add_message_to_conversation(
                db,
                MessageCreate(
                    role="function_call_result",
                    content=response_text,
                    model=model,
                    provider=api_key.provider,
                ),
                conversation
            )

            return response_text

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
    prompt = f"Generate a short, concise title (under 10 words) for the following conversation based on the user's initial message and the assistant's response (use plain text for the output. Do not use JSON or anything similar!):\n\nUser: {user_message}\nAssistant: {assistant_message}\n\nTitle:"

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

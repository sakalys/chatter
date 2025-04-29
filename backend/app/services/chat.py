from datetime import datetime
import logging # Import logging
import json
from typing import Any, AsyncGenerator
from uuid import UUID
import asyncio
from google import genai
from openai import AsyncOpenAI # Import AsyncOpenAI

import httpx
from fastapi import HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.message import MessageCreate
from app.services.api_key import decrypt_api_key
from app.services.conversation import add_message_to_conversation, get_conversation_by_id, get_conversation_by_id_and_user_id, update_conversation
from app.schemas.conversation import ConversationCreate, ConversationUpdate

logger = logging.getLogger(__name__) # Get logger

async def _generate_google_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
) -> AsyncGenerator[str, None]:
    """
    Generate a chat response from the Google API.

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted Google API key
        stream: Whether to stream the response

    Returns:
        Response from the Google API
    """
    headers = {
        "Content-Type": "application/json",
    }
    
    # Format messages for Google's API
    formatted_messages = []
    for msg in messages:
        logger.info(f"Processing message of type: {type(msg)}, with keys: {msg.keys()}")
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

    times = []
    async for chunk in await client.aio.models.generate_content_stream(
        # model="gemini-2.0-flash-001",
        model=model,
        contents=formatted_messages,
    ):
        yield chunk.text

    return

async def _generate_openai_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
) -> AsyncGenerator[str, None]:
    """
    Generate a chat response from the OpenAI API using the SDK.

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted OpenAI API key

    Returns:
        Streaming response from the OpenAI API
    """
    client = AsyncOpenAI(api_key=api_key)

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content is not None:
            yield chunk.choices[0].delta.content


async def generate_chat_response(
    messages: list[dict[str, str]], # Changed type hint to match _generate functions
    model: str,
    api_key: str,  # Changed to expect decrypted key string
    provider: str,  # Added provider parameter
) -> AsyncGenerator[str, None]:
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
    
    if provider == "google":
        response = _generate_google_response(messages, model, api_key)
        return response
    elif provider == "openai":
        response = _generate_openai_response(messages, model, api_key)
        return response

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported LLM provider: {provider}",
    )

async def handle_chat_request(
    db,
    user_id: UUID,
    user_message: str,
    model: str,
    api_key: ApiKey,
    conversation_id: UUID | None = None,
    stream: bool = False,
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
        stream: Whether to stream the response
        
        Returns:
            Response from the LLM provider or SSE response, including the conversation ID
    """
    logger.info(f"Handling chat request for user: {user_id}, conversation: {conversation_id}, stream: {stream}") # Log handling request
    
    is_new_conversation = conversation_id is None

    # If no conversation_id is provided, create a new conversation
    if is_new_conversation:
        from app.services.conversation import create_conversation
        conversation = await create_conversation(db, ConversationCreate(), user_id)
        conversation_id = conversation.id
        logger.info(f"Created new conversation with ID: {conversation_id}") # Log new conversation
    else:
        # Get conversation to ensure it exists and belongs to the user
        conversation = await get_conversation_by_id_and_user_id(db, conversation_id, user_id)
        if not conversation:
            logger.error(f"Conversation not found for ID: {conversation_id}") # Log error
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

    # Add user message to conversation
    user_message_obj = await add_message_to_conversation(
        db,
        MessageCreate(
            role="user",
            content=user_message,
        ),
        conversation_id
    )
    logger.info(f"Added user message to conversation: {conversation_id}") # Log adding user message
    
    # Get all messages in the conversation
    from app.services.conversation import get_messages_by_conversation
    messages = await get_messages_by_conversation(db, conversation_id)
    logger.info(f"Retrieved {len(messages)} messages for conversation: {conversation_id}") # Log retrieving messages

    # Format messages for the provider
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "role": msg.role,
            "content": msg.content
        })

    try:
        logger.info("Calling generate_chat_response") # Log before calling generation
        # Decrypt the API key before passing it to generate_chat_response
        decrypted_key = decrypt_api_key(api_key.key_reference)
        logger.info(f"Decrypted API key (first 5 chars): {decrypted_key[:5]}...") # Log first 5 chars of decrypted key
        
        # Generate response - pass the formatted messages list
        response = await generate_chat_response(
            messages=formatted_messages,
            model=model,
            api_key=decrypted_key,  # Pass the decrypted key directly
            provider=api_key.provider,  # Pass the provider separately
        )
        logger.info(f"Finished generate_chat_response. Response type: {type(response)}") # Log after calling generation and response type
            
        async def event_generator():
            # If it's a new conversation, send an initial event with the conversation ID
            if is_new_conversation:
                logger.info(f"Sending initial conversation_id event: {conversation_id}")
                yield {
                    "event": "conversation_created",
                    "data": str(conversation_id)
                }
                # Add a small delay to ensure the event is sent before the stream starts
                await asyncio.sleep(0.01) 

            content = ""
            async for chunk in response:
                content += chunk
                yield {
                    "event": "message",
                    "data": chunk
                }

            from app.services.conversation import add_message_to_conversation
            await add_message_to_conversation(
                db,
                MessageCreate(
                    role="assistant",
                    content=content,
                    model=model,
                    metadata={"provider": api_key.provider},
                ),
                conversation_id
            )

            # Generate and set conversation title after the first response
            if is_new_conversation and content:
                generated_title = await generate_and_set_conversation_title(
                    db=db,
                    conversation_id=conversation_id,
                    user_message=user_message,
                    assistant_message=content,
                    api_key=decrypted_key,
                    provider=api_key.provider,
                    model=model
                )
                if generated_title:
                    logger.info(f"Sending conversation_title_updated event: {generated_title}")
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
    conversation_id: UUID,
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
    logger.info(f"Generating title for conversation: {conversation_id}")

    # Construct prompt for title generation
    prompt = f"Generate a short, concise title (under 10 words) for the following conversation based on the user's initial message and the assistant's response:\n\nUser: {user_message}\nAssistant: {assistant_message}\n\nTitle:"

    title = ''
    try:
        generator = await generate_chat_response(
            messages=[
                {"role": "user", "content": prompt}
            ],
            model=model,
            api_key=api_key,
            provider=provider,
        )

        async for title_part in generator:
            title += title_part

        if title:
            # Update the conversation in the database
            conversation = await get_conversation_by_id(db, conversation_id) # User ID is not needed for internal update
            if conversation:
                await update_conversation(db, conversation, ConversationUpdate(title=title))
            else:
                logger.error(f"Conversation not found for ID: {conversation_id}")

    except Exception as e:
        logger.error(f"Error generating or setting conversation title: {e}", exc_info=True)
        # Don't raise an exception here, title generation is not critical

    return title

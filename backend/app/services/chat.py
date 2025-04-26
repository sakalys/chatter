import json
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sse_starlette.sse import EventSourceResponse

from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.message import MessageCreate
from app.services.api_key import decrypt_api_key
from app.services.conversation import add_message_to_conversation

# Define the LLM provider API endpoints
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1/models"


async def _generate_openai_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    stream: bool = False,
) -> dict[str, Any]:
    """
    Generate a chat response from the OpenAI API.

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted OpenAI API key
        stream: Whether to stream the response

    Returns:
        Response from the OpenAI API
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(OPENAI_API_URL, headers=headers, json=payload)

    response.raise_for_status()  # Raise an exception for bad status codes
    return response.json()


async def _generate_anthropic_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    stream: bool = False,
) -> dict[str, Any]:
    """
    Generate a chat response from the Anthropic API.

    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted Anthropic API key
        stream: Whether to stream the response

    Returns:
        Response from the Anthropic API
    """
    # TODO: Implement Anthropic API call
    raise NotImplementedError("Anthropic API integration not yet implemented")


async def _generate_google_response(
    messages: list[dict[str, str]],
    model: str,
    api_key: str,
    stream: bool = False,
) -> dict[str, Any]:
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
        if msg["role"] == "user":
            formatted_messages.append({"role": "user", "parts": [{"text": msg["content"]}]})
        elif msg["role"] == "assistant":
            formatted_messages.append({"role": "model", "parts": [{"text": msg["content"]}]})
        elif msg["role"] == "system":
            formatted_messages.append({"role": "user", "parts": [{"text": f"System: {msg['content']}"}]})

    payload = {
        "contents": formatted_messages,
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 1024,
        },
    }

    url = f"{GOOGLE_API_URL}/{model}:generateContent?key={api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)

    response.raise_for_status()
    return response.json()


async def generate_chat_response(
    conversation: Conversation,
    messages: list[Message],
    model: str,
    api_key: ApiKey,
    stream: bool = False,
) -> dict[str, Any]:
    """
    Generate a chat response from an LLM provider.
    
    Args:
        conversation: Conversation object
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: API key to use for the request
        stream: Whether to stream the response
        
    Returns:
        Response from the LLM provider
    """
    # Decrypt the API key
    decrypted_key = decrypt_api_key(api_key.key_reference)
    
    # Format messages for the provider
    formatted_messages = [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in messages
    ]
    
    # Determine which provider to use
    if api_key.provider == "openai":
        return await _generate_openai_response(
            formatted_messages, model, decrypted_key, stream
        )
    if api_key.provider == "anthropic":
        return await _generate_anthropic_response(
            formatted_messages, model, decrypted_key, stream
        )
    if api_key.provider == "google":
        return await _generate_google_response(
            formatted_messages, model, decrypted_key, stream
        )
    # If the provider is not supported, raise an error
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported LLM provider: {api_key.provider}",
    )


async def process_chat_stream(
    stream_response,
    conversation_id: UUID,
    model: str,
    provider: str,
):
    """
    Process a streaming chat response.
    
    Args:
        stream_response: Streaming response from the LLM provider
        conversation_id: Conversation ID
        model: Model used for generation
        provider: Provider name
        
    Returns:
        Generator for SSE events
    """
    content = ""
    
    # This part is not needed for hardcoded response, but keeping the structure
    # in case streaming is implemented later.
    
    # Final event with complete message
    yield {
        "event": "message",
        "data": content
    }
    
    # End event
    yield {
        "event": "done",
        "data": ""
    }


from app.schemas.conversation import ConversationCreate

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
    # If no conversation_id is provided, create a new conversation
    if conversation_id is None:
        from app.services.conversation import create_conversation
        conversation = await create_conversation(db, ConversationCreate(), user_id)
        conversation_id = conversation.id
    else:
        # Get conversation to ensure it exists and belongs to the user
        from app.services.conversation import get_conversation_by_id
        conversation = await get_conversation_by_id(db, conversation_id, user_id)
        if not conversation:
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
    
    # Get all messages in the conversation (not strictly needed for hardcoded response, but good practice)
    from app.services.conversation import get_messages_by_conversation
    messages = await get_messages_by_conversation(db, conversation_id)
    
    try:
        # Generate response (using hardcoded response)
        response = await generate_chat_response(
            conversation, messages, model, api_key, stream=False # stream is ignored for hardcoded response
        )

        # Extract content from hardcoded response
        content = response["choices"][0]["message"]["content"]

        # Add assistant message to conversation
        assistant_message = await add_message_to_conversation(
            db,
            MessageCreate(
                role="assistant",
                content=content,
                model=model,
                metadata={"response": response}
            ),
            conversation_id
        )

        return {
            "conversation_id": str(conversation_id),
            "message": {
                "id": str(assistant_message.id),
                "role": assistant_message.role,
                "content": assistant_message.content,
                "model": assistant_message.model,
                "created_at": assistant_message.created_at.isoformat(),
            }
        }
    except Exception as e:
        # Log the error with traceback and return an HTTPException
        import traceback
        print(f"Error generating chat response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating chat response: {e}"
        )

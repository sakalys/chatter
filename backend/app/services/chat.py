import json
from typing import Any, Dict, List, Optional
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


async def generate_chat_response(
    conversation: Conversation,
    messages: List[Message],
    model: str,
    api_key: ApiKey,
    stream: bool = False,
) -> Dict[str, Any]:
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
    elif api_key.provider == "anthropic":
        return await _generate_anthropic_response(
            formatted_messages, model, decrypted_key, stream
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider: {api_key.provider}"
        )


async def _generate_openai_response(
    messages: List[Dict[str, str]],
    model: str,
    api_key: str,
    stream: bool = False,
) -> Dict[str, Any]:
    """
    Generate a chat response from OpenAI.
    
    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: API key to use for the request
        stream: Whether to stream the response
        
    Returns:
        Response from OpenAI
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        data = {
            "model": model,
            "messages": messages,
            "stream": stream
        }
        
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60.0
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error from OpenAI: {response.text}"
            )
        
        if stream:
            return response.iter_lines()
        else:
            return response.json()


async def _generate_anthropic_response(
    messages: List[Dict[str, str]],
    model: str,
    api_key: str,
    stream: bool = False,
) -> Dict[str, Any]:
    """
    Generate a chat response from Anthropic.
    
    Args:
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: API key to use for the request
        stream: Whether to stream the response
        
    Returns:
        Response from Anthropic
    """
    # Convert messages to Anthropic format
    system_message = None
    anthropic_messages = []
    
    for msg in messages:
        if msg["role"] == "system":
            system_message = msg["content"]
        else:
            anthropic_messages.append(msg)
    
    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": model,
            "messages": anthropic_messages,
            "stream": stream
        }
        
        if system_message:
            data["system"] = system_message
        
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data,
            timeout=60.0
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error from Anthropic: {response.text}"
            )
        
        if stream:
            return response.iter_lines()
        else:
            return response.json()


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
    
    if provider == "openai":
        async for line in stream_response:
            if line:
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    line = line[6:]
                    if line.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(line)
                        if chunk.get("choices") and len(chunk["choices"]) > 0:
                            delta = chunk["choices"][0].get("delta", {})
                            if "content" in delta:
                                content_chunk = delta["content"]
                                content += content_chunk
                                yield {
                                    "event": "message",
                                    "data": content_chunk
                                }
                    except json.JSONDecodeError:
                        pass
    
    elif provider == "anthropic":
        async for line in stream_response:
            if line:
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    line = line[6:]
                    try:
                        chunk = json.loads(line)
                        if chunk.get("type") == "content_block_delta":
                            delta = chunk.get("delta", {})
                            if "text" in delta:
                                content_chunk = delta["text"]
                                content += content_chunk
                                yield {
                                    "event": "message",
                                    "data": content_chunk
                                }
                    except json.JSONDecodeError:
                        pass
    
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


async def handle_chat_request(
    db,
    conversation_id: UUID,
    user_message: str,
    model: str,
    api_key: ApiKey,
    stream: bool = False,
) -> Any:
    """
    Handle a chat request.
    
    Args:
        db: Database session
        conversation_id: Conversation ID
        user_message: User message
        model: Model to use for generation
        api_key: API key to use for the request
        stream: Whether to stream the response
        
    Returns:
        Response from the LLM provider or SSE response
    """
    # Add user message to conversation
    user_message_obj = await add_message_to_conversation(
        db,
        MessageCreate(
            role="user",
            content=user_message,
        ),
        conversation_id
    )
    
    # Get all messages in the conversation
    from app.services.conversation import get_messages_by_conversation
    messages = await get_messages_by_conversation(db, conversation_id)
    
    # Get conversation
    from app.services.conversation import get_conversation_by_id
    conversation = await get_conversation_by_id(db, conversation_id, api_key.user_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Generate response
    if stream:
        response = await generate_chat_response(
            conversation, messages, model, api_key, stream=True
        )
        
        # Create a new message for the assistant response
        assistant_message = await add_message_to_conversation(
            db,
            MessageCreate(
                role="assistant",
                content="",  # Will be updated after streaming
                model=model,
            ),
            conversation_id
        )
        
        # Return streaming response
        return EventSourceResponse(
            process_chat_stream(
                response,
                conversation_id,
                model,
                api_key.provider
            )
        )
    else:
        response = await generate_chat_response(
            conversation, messages, model, api_key, stream=False
        )
        
        # Extract content from response based on provider
        if api_key.provider == "openai":
            content = response["choices"][0]["message"]["content"]
        elif api_key.provider == "anthropic":
            content = response["content"][0]["text"]
        else:
            content = "Unsupported provider response"
        
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
            "id": str(assistant_message.id),
            "role": assistant_message.role,
            "content": assistant_message.content,
            "model": assistant_message.model,
            "created_at": assistant_message.created_at.isoformat(),
        }

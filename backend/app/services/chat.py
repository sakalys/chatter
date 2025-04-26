import logging # Import logging
import json
from typing import Any
from uuid import UUID
import asyncio

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
GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"

logger = logging.getLogger(__name__) # Get logger

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

    payload = {
        "contents": formatted_messages,
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 1024,
        },
    }

    # Use the API key directly since it's already decrypted
    url = f"{GOOGLE_API_URL}/{model}:generateContent?key={api_key}"
    logger.info(f"Using API key: {api_key[:5]}...") # Log first 5 chars of API key for debugging
    
    # Create a new client for each request
    client = httpx.AsyncClient()
    try:
        if stream:
            logger.info(f"Streaming POST request to Google API: {url}")
            # For streaming, we need to use the context manager directly
            async def stream_handler():
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    logger.info(f"Stream response status: {response.status_code}")
                    if response.status_code != 200:
                        # Read the error response content
                        error_content = await response.aread()
                        try:
                            error_data = json.loads(error_content)
                            error_message = error_data.get('error', {}).get('message', 'Unknown error')
                        except json.JSONDecodeError:
                            error_message = f"Error: HTTP {response.status_code}"
                        logger.error(f"Google API error: {error_message}")
                        yield f"Error: {error_message}"
                        return
                        
                    async for chunk in response.aiter_text():
                        logger.info(f"Raw chunk: {chunk}")
                        try:
                            data = json.loads(chunk)
                            logger.info(f"Parsed data: {data}")
                            
                            # Extract text from Google API response
                            text = ""
                            if "candidates" in data and data["candidates"]:
                                candidate = data["candidates"][0]
                                if "content" in candidate and "parts" in candidate["content"]:
                                    for part in candidate["content"]["parts"]:
                                        if "text" in part:
                                            text += part["text"]
                            
                            if text:
                                logger.info(f"Extracted text: {text}")
                                yield text
                        except Exception as e:
                            logger.error(f"Error processing chunk: {e}", exc_info=True)
            
            # Return the stream handler
            return stream_handler
        else:
            logger.info(f"Non-streaming POST request to Google API: {url}")
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
    finally:
        # Only close the client if we're not streaming
        if not stream:
            await client.aclose()


async def generate_chat_response(
    conversation: Conversation,
    messages: list[dict[str, str]], # Changed type hint to match _generate functions
    model: str,
    api_key: str,  # Changed to expect decrypted key string
    provider: str,  # Added provider parameter
    stream: bool = False,
) -> Any: # Changed return type to Any to accommodate both dict and httpx.Response
    """
    Generate a chat response from an LLM provider.
    
    Args:
        conversation: Conversation object
        messages: List of messages in the conversation
        model: Model to use for generation
        api_key: Decrypted API key string
        provider: Provider name (openai, anthropic, or google)
        stream: Whether to stream the response
        
    Returns:
        Response from the LLM provider or streaming response object
    """
    logger.info(f"Generating chat response for model: {model}, stream: {stream}") # Log generation request
    
    # Determine which provider to use
    if provider == "openai":
        logger.info("Using OpenAI provider") # Log provider
        return await _generate_openai_response(
            messages, model, api_key, stream
        )
    if provider == "anthropic":
        logger.info("Using Anthropic provider") # Log provider
        return await _generate_anthropic_response(
            messages, model, api_key, stream
        )
    if provider == "google":
        logger.info("Using Google provider") # Log provider
        logger.info(f"Calling _generate_google_response with stream={stream}") # Log before calling google generation
        response = await _generate_google_response(
            messages, model, api_key, stream
        )
        logger.info(f"_generate_google_response returned type: {type(response)}") # Log type after calling google generation
        return response
    # If the provider is not supported, raise an error
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported LLM provider: {provider}",
    )


async def process_chat_stream(
    stream_response: Any,
    conversation_id: UUID,
    model: str,
    provider: str,
    db
):
    """
    Process a streaming chat response.
    
    Args:
        stream_response: Streaming response from the LLM provider (could be httpx.Response, context manager, or generator)
        conversation_id: Conversation ID
        model: Model used for generation
        provider: Provider name
        db: Database session
        
    Returns:
        Generator for SSE events
    """
    logger.info(f"Processing chat stream for conversation: {conversation_id}")
    content = ""
    
    # Handle the streaming response
    if hasattr(stream_response, '__call__'):
        logger.info("Stream response is a generator function, calling it")
        async for text in stream_response():
            logger.info(f"Received text from generator: {text}")
            content += text
            yield {
                "event": "message",
                "data": text
            }
    elif hasattr(stream_response, 'aiter_text'):
        logger.info("Stream response is a direct httpx.Response object")
        logger.info(f"Response status code: {stream_response.status_code}")
        logger.info(f"Response headers: {stream_response.headers}")
        
        async for chunk in stream_response.aiter_text():
            try:
                data = json.loads(chunk)
                logger.info(f"Parsed JSON data: {data}")
                
                text = ""
                if provider == "google":
                    if "candidates" in data and data["candidates"]:
                        logger.info(f"Found candidates: {data['candidates']}")
                        candidate = data["candidates"][0]
                        if "content" in candidate:
                            logger.info(f"Found content in candidate: {candidate['content']}")
                            if "parts" in candidate["content"]:
                                logger.info(f"Found parts in content: {candidate['content']['parts']}")
                                for part in candidate["content"]["parts"]:
                                    if "text" in part:
                                        text += part["text"]
                                        logger.info(f"Found text in part: {part['text']}")
                else:
                    if "text" in data:
                        text = data["text"]
                        logger.info(f"Found text in 'text' key: {text}")
                    elif "candidates" in data and data["candidates"]:
                        logger.info(f"Found candidates: {data['candidates']}")
                        candidate = data["candidates"][0]
                        if "content" in candidate:
                            logger.info(f"Found content in candidate: {candidate['content']}")
                            if "parts" in candidate["content"]:
                                logger.info(f"Found parts in content: {candidate['content']['parts']}")
                                for part in candidate["content"]["parts"]:
                                    if "text" in part:
                                        text += part["text"]
                                        logger.info(f"Found text in part: {part['text']}")
                
                if not text:
                    logger.info(f"No text found in expected locations. Data keys: {data.keys()}")

                if text:
                    content += text
                    logger.info(f"Yielding text: {text}")
                    yield {
                        "event": "message",
                        "data": text
                    }
                else:
                    logger.info("No text extracted from chunk")

            except json.JSONDecodeError as e:
                logger.error(f"Could not decode JSON from chunk: {chunk}. Error: {e}")
                pass
            except Exception as e:
                logger.error(f"Error processing stream chunk: {e}", exc_info=True)
                pass
    else:
        logger.error(f"Unexpected stream response type: {type(stream_response)}")
        yield {
            "event": "error",
            "data": "Unexpected stream response type"
        }

    # After the stream is done, save the complete message to the database
    if content:
        logger.info("Stream finished, saving message to database")
        from app.services.conversation import add_message_to_conversation
        await add_message_to_conversation(
            db,
            MessageCreate(
                role="assistant",
                content=content,
                model=model,
                metadata={"provider": provider}
            ),
            conversation_id
        )

    # End event
    logger.info("Sending done event")
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
    logger.info(f"Handling chat request for user: {user_id}, conversation: {conversation_id}, stream: {stream}") # Log handling request
    # If no conversation_id is provided, create a new conversation
    if conversation_id is None:
        from app.services.conversation import create_conversation
        conversation = await create_conversation(db, ConversationCreate(), user_id)
        conversation_id = conversation.id
        logger.info(f"Created new conversation with ID: {conversation_id}") # Log new conversation
    else:
        # Get conversation to ensure it exists and belongs to the user
        from app.services.conversation import get_conversation_by_id
        conversation = await get_conversation_by_id(db, conversation_id, user_id)
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
            conversation=conversation,
            messages=formatted_messages,
            model=model,
            api_key=decrypted_key,  # Pass the decrypted key directly
            provider=api_key.provider,  # Pass the provider separately
            stream=stream
        )
        logger.info(f"Finished generate_chat_response. Response type: {type(response)}") # Log after calling generation and response type

        if stream and api_key.provider == "google":
            logger.info(f"Returning streaming response for Google. Response type: {type(response)}") # Log returning stream and response type
            # Return streaming response for Google
            # The response is already a context manager, so we can use it directly
            return EventSourceResponse(process_chat_stream(response, conversation_id, model, api_key.provider, db))
        else:
            logger.info(f"Handling non-streaming response. Response type: {type(response)}") # Log handling non-stream and response type
            # Handle non-streaming response (for OpenAI and potentially others)
            # Extract content from the response - this part needs to be adapted for other providers if they are not streaming
            if api_key.provider == "openai":
                 content = response["choices"][0]["message"]["content"]
            # Removed non-streaming Google content extraction to focus on streaming
            # elif api_key.provider == "google":
            #      # For non-streaming Google response
            #      content = response["candidates"][0]["content"]["parts"][0]["text"]
            else:
                 # Handle other providers if needed
                 # Log the response object to understand its structure
                 logger.error(f"Unexpected non-streaming response format or streaming issue. Response: {response}")
                 content = "Unsupported provider response format or streaming issue" # Updated message


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
            logger.info(f"Added assistant message to conversation: {conversation_id}") # Log adding assistant message

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
        logger.error(f"Error generating chat response: {e}", exc_info=True) # Log error with traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating chat response: {e}"
        )

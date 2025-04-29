import logging # Import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body # Import Query and Body

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.services.api_key import get_api_key_by_id
from app.services.chat import handle_chat_request
from app.schemas.chat import ChatCompletionRequest

router = APIRouter()

logger = logging.getLogger(__name__) # Get logger

@router.api_route("/generate", methods=["GET", "POST"], response_model=dict[str, Any])
async def generate_chat_response(
    request: ChatCompletionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Generate a chat response.
    
    Args:
        request: The request body containing message, model, api_key_id, conversation_id, and stream.
        
    Returns:
        Response from the LLM provider or SSE response
    """
    logger.info(f"Received chat generation request: {request}") # Log request

    # Convert api_key_id string to UUID
    try:
        api_key_uuid = UUID(request.api_key_id)
    except ValueError:
        logger.error(f"Invalid API key ID format: {request.api_key_id}") # Log error
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid API key ID format",
        )

    # Check if API key exists and belongs to user
    api_key = await get_api_key_by_id(db, api_key_uuid, current_user.id)
    if not api_key:
        logger.error(f"API key not found for ID: {api_key_uuid}") # Log error
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    
    logger.info("Calling handle_chat_request") # Log before calling service
    # Handle chat request
    response = await handle_chat_request(
        db=db,
        user_id=current_user.id, # Pass user_id to service
        conversation_id=request.conversation_id,
        user_message=request.message,
        model=request.model,
        api_key=api_key,
        stream=request.stream,
    )
    logger.info("Finished handle_chat_request") # Log after calling service
    
    return response


@router.get("/models", response_model=dict[str, list[dict[str, str]]])
async def list_available_models():
    """
    List available models for each provider.
    """
    return {
        "openai": [
            {"id": "gpt-4o", "name": "GPT-4o"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
            {"id": "gpt-4", "name": "GPT-4"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"},
        ],
        "anthropic": [
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus"},
            {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet"},
            {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku"},
            {"id": "claude-2.1", "name": "Claude 2.1"},
            {"id": "claude-2.0", "name": "Claude 2.0"},
            {"id": "claude-instant-1.2", "name": "Claude Instant 1.2"},
        ],
        "google": [
            {"id": "gemini-2.5-flash-preview-04-17", "name": "Gemini 2.5 Flash"},
            {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash"},
            {"id": "gemini-2.5-pro-preview-03-25", "name": "Gemini 2.5 Pro"},
        ],
    }

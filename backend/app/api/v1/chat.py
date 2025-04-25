from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.services.api_key import get_api_key_by_id
from app.services.chat import handle_chat_request
from app.services.conversation import get_conversation_by_id

router = APIRouter()


@router.post("/{conversation_id}/generate", response_model=dict[str, Any])
async def generate_chat_response(
    conversation_id: UUID,
    message: str,
    model: str,
    api_key_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
    stream: bool = False,
):
    """
    Generate a chat response for a specific conversation.
    
    Args:
        conversation_id: Conversation ID
        message: User message
        model: Model to use for generation
        api_key_id: API key ID to use for the request
        stream: Whether to stream the response
        
    Returns:
        Response from the LLM provider or SSE response
    """
    # Check if conversation exists and belongs to user
    conversation = await get_conversation_by_id(db, conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    # Check if API key exists and belongs to user
    api_key = await get_api_key_by_id(db, api_key_id, current_user.id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    
    # Handle chat request
    response = await handle_chat_request(
        db=db,
        conversation_id=conversation_id,
        user_message=message,
        model=model,
        api_key=api_key,
        stream=stream,
    )
    
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
    }

import logging # Import logging
from typing import Annotated, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body # Import Query and Body

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.services.api_key import get_users_api_key_by_id
from app.services.chat import handle_chat_request
from pydantic import BaseModel

router = APIRouter()

logger = logging.getLogger(__name__) # Get logger


class ChatCompletionRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str
    model: str
    api_key_id: str
    tool_decision: Optional[bool] = None


@router.api_route("/generate", methods=["GET", "POST"], response_model=dict[str, Any])
async def generate_chat_response(
    request: ChatCompletionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Generate a chat response.
    
    Args:
        request: The request body.
        
    Returns:
        Response from the LLM provider or SSE response
    """
    logger.debug(f"Received chat generation request: {request}") # Log request

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
    api_key = await get_users_api_key_by_id(db, api_key_uuid, current_user.id)
    if not api_key:
        logger.error(f"API key not found for ID: {api_key_uuid}") # Log error
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    
    logger.debug("Calling handle_chat_request") # Log before calling service

    response = await handle_chat_request(
        db=db,
        user=current_user,
        conversation_id=request.conversation_id,
        user_message=request.message,
        model=request.model,
        api_key=api_key,
        tool_decision=request.tool_decision,
    )
    logger.debug("Finished handle_chat_request") # Log after calling service
    
    return response

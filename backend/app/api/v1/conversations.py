from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    ConversationUpdate,
)
from app.schemas.message import MessageCreate, MessageResponse
from app.services.conversation import (
    add_message_to_conversation,
    create_conversation,
    delete_conversation,
    get_conversation_by_id,
    get_conversation_with_messages,
    get_conversations_by_user,
    get_messages_by_conversation,
    update_conversation,
)

router = APIRouter()


@router.get("/", response_model=list[ConversationResponse])
async def read_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get all conversations for the current user.
    """
    conversations = await get_conversations_by_user(db, current_user.id)
    return conversations


@router.post("/", response_model=ConversationResponse)
async def create_user_conversation(
    conversation_in: ConversationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Create a new conversation for the current user.
    """
    conversation = await create_conversation(db, conversation_in, current_user.id)
    return conversation


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def read_conversation(
    conversation_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get a specific conversation by id with its messages.
    """
    conversation = await get_conversation_with_messages(db, conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_user_conversation(
    conversation_id: UUID,
    conversation_in: ConversationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Update a specific conversation.
    """
    conversation = await get_conversation_by_id(db, conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    conversation = await update_conversation(db, conversation, conversation_in)
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_conversation(
    conversation_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Delete a specific conversation.
    """
    conversation = await get_conversation_by_id(db, conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    await delete_conversation(db, conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def read_conversation_messages(
    conversation_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get all messages for a specific conversation.
    """
    conversation = await get_conversation_by_id(db, conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    messages = await get_messages_by_conversation(db, conversation_id)
    return messages


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def create_conversation_message(
    conversation_id: UUID,
    message_in: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Add a message to a specific conversation.
    """
    conversation = await get_conversation_by_id(db, conversation_id, current_user.id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    message = await add_message_to_conversation(db, message_in, conversation_id)
    return message

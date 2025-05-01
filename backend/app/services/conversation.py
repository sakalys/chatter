from json import tool
from typing import Optional
from uuid import UUID

from app.models.mcp_tool import MCPTool
from app.models.mcp_tool_use import MCPToolUse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate, ConversationUpdate
from app.schemas.message import MessageCreate


async def get_conversations_by_user(
    db: AsyncSession, user_id: UUID
) -> list[Conversation]:
    """
    Get all conversations for a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of conversation objects
    """
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()

async def get_conversation_by_id(
    db: AsyncSession,
    conversation_id: UUID,
) -> Conversation | None:
    """
    Get a conversation by ID for a specific user.
    
    Args:
        db: Database session
        conversation_id: Conversation ID
        user_id: User ID
        
    Returns:
        Conversation object or None if not found
    """
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
        )
    )
    return result.scalars().first()

async def get_conversation_by_id_and_user_id(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> Conversation | None:
    """
    Get a conversation by ID for a specific user.
    
    Args:
        db: Database session
        conversation_id: Conversation ID
        user_id: User ID
        
    Returns:
        Conversation object or None if not found
    """
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
    )
    return result.scalars().first()


async def get_conversation_with_messages(
    db: AsyncSession, conversation_id: UUID, user_id: UUID
) -> Conversation | None:
    """
    Get a conversation with its messages by ID for a specific user.
    
    Args:
        db: Database session
        conversation_id: Conversation ID
        user_id: User ID
        
    Returns:
        Conversation object with messages or None if not found
    """
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        )
        .options(selectinload(Conversation.messages))
    )
    return result.scalars().first()


async def create_conversation(
    db: AsyncSession,
    conversation_in: ConversationCreate,
    user_id: UUID,
) -> Conversation:
    """
    Create a new conversation.
    
    Args:
        db: Database session
        conversation_in: Conversation creation data
        user_id: User ID
        
    Returns:
        Created conversation object
    """
    conversation = Conversation(
        user_id=user_id,
        title=conversation_in.title,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def update_conversation(
    db: AsyncSession,
    conversation: Conversation,
    conversation_in: ConversationUpdate,
) -> Conversation:
    """
    Update a conversation.
    
    Args:
        db: Database session
        conversation: Conversation object to update
        conversation_in: Conversation update data
        
    Returns:
        Updated conversation object
    """
    update_data = conversation_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(conversation, field, value)
    
    await db.commit()
    await db.refresh(conversation)

    return conversation


async def delete_conversation(
    db: AsyncSession, conversation: Conversation
) -> None:
    """
    Delete a conversation.
    
    Args:
        db: Database session
        conversation: Conversation object to delete
    """
    await db.delete(conversation)
    await db.commit()


async def add_message_to_conversation(
    db: AsyncSession,
    message_in: MessageCreate,
    conversation: Conversation,
    mcp_tool: Optional[MCPTool] = None

) -> Message:
    """
    Add a message to a conversation.
    
    Args:
        db: Database session
        message_in: Message creation data
        conversation_id: Conversation ID
        
    Returns:
        Created message object
    """
    message = Message(
        role=message_in.role,
        content=message_in.content,
        model=message_in.model,
        meta=message_in.meta,
        conversation=conversation,
    )
    db.add(message)

    if (message_in.tool_use):
        tool_use = MCPToolUse(
            name=message_in.tool_use.name,
            args=message_in.tool_use.args,
            tool=mcp_tool,
        )
        message.mcp_tool_use = tool_use
        db.add(tool_use)

    await db.commit()
    await db.refresh(message)
    return message


async def get_messages_by_conversation(
    db: AsyncSession,
    conversation_id: UUID,
) -> list[Message]:
    """
    Get all messages for a conversation.
    
    Args:
        db: Database session
        conversation_id: Conversation ID
        
    Returns:
        List of message objects
    """
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    return result.scalars().all()

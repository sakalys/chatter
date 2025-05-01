from uuid import UUID

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationUpdate
from app.schemas.message import MessageCreate
from app.schemas.user import UserCreate
from app.services.conversation import (
    add_message_to_conversation,
    create_conversation,
    delete_conversation,
    get_conversation_by_id_and_user_id,
    get_conversation_with_messages,
    get_conversations_by_user,
    get_messages_by_conversation,
    update_conversation,
)
from app.services.user import create_user


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession) -> User:
    """Create a test user."""
    user_in = UserCreate(
        email="conversation_test@example.com",
        password="testpassword",
        full_name="Conversation Test User",
    )
    user = await create_user(test_db, user_in)
    return user


@pytest_asyncio.fixture
async def test_conversation(test_db: AsyncSession, test_user: User):
    """Create a test conversation."""
    conversation_in = ConversationCreate(title="Test Conversation")
    conversation = await create_conversation(test_db, conversation_in, test_user.id)
    return conversation


@pytest.mark.asyncio
async def test_create_conversation(test_db: AsyncSession, test_user: User):
    """Test creating a conversation."""
    conversation_in = ConversationCreate(title="New Conversation")
    conversation = await create_conversation(test_db, conversation_in, test_user.id)
    
    assert conversation.title == conversation_in.title
    assert conversation.user_id == test_user.id
    assert isinstance(conversation.id, UUID)


@pytest.mark.asyncio
async def test_get_conversation_by_id(test_db: AsyncSession, test_user: User, test_conversation):
    """Test getting a conversation by ID."""
    conversation = await get_conversation_by_id_and_user_id(test_db, test_conversation.id, test_user.id)
    
    assert conversation is not None
    assert conversation.id == test_conversation.id
    assert conversation.title == test_conversation.title
    assert conversation.user_id == test_user.id


@pytest.mark.asyncio
async def test_get_conversation_by_id_not_found(test_db: AsyncSession, test_user: User):
    """Test getting a conversation by ID that doesn't exist."""
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")
    conversation = await get_conversation_by_id_and_user_id(test_db, non_existent_id, test_user.id)
    
    assert conversation is None


@pytest.mark.asyncio
async def test_get_conversations_by_user(test_db: AsyncSession, test_user: User, test_conversation):
    """Test getting all conversations for a user."""
    # Create another conversation for the same user
    conversation_in = ConversationCreate(title="Another Conversation")
    await create_conversation(test_db, conversation_in, test_user.id)
    
    conversations = await get_conversations_by_user(test_db, test_user.id)
    
    assert len(conversations) == 2
    assert any(c.title == "Test Conversation" for c in conversations)
    assert any(c.title == "Another Conversation" for c in conversations)


@pytest.mark.asyncio
async def test_update_conversation(test_db: AsyncSession, test_conversation):
    """Test updating a conversation."""
    conversation_update = ConversationUpdate(title="Updated Conversation")
    updated_conversation = await update_conversation(test_db, test_conversation, conversation_update)
    
    assert updated_conversation.title == "Updated Conversation"
    assert updated_conversation.id == test_conversation.id
    assert updated_conversation.user_id == test_conversation.user_id


@pytest.mark.asyncio
async def test_delete_conversation(test_db: AsyncSession, test_user: User):
    """Test deleting a conversation."""
    # Create a conversation to delete
    conversation_in = ConversationCreate(title="Conversation to Delete")
    conversation = await create_conversation(test_db, conversation_in, test_user.id)
    
    # Delete the conversation
    await delete_conversation(test_db, conversation)
    
    # Try to get the deleted conversation
    deleted_conversation = await get_conversation_by_id_and_user_id(test_db, conversation.id, test_user.id)
    assert deleted_conversation is None


@pytest.mark.asyncio
async def test_add_message_to_conversation(test_db: AsyncSession, test_conversation):
    """Test adding a message to a conversation."""
    message_in = MessageCreate(
        role="user",
        content="Hello, this is a test message",
    )
    message = await add_message_to_conversation(test_db, message_in, test_conversation)
    
    assert message.role == message_in.role
    assert message.content == message_in.content
    assert message.conversation_id == test_conversation.id
    assert isinstance(message.id, UUID)


@pytest.mark.asyncio
async def test_get_messages_by_conversation(test_db: AsyncSession, test_conversation):
    """Test getting all messages for a conversation."""
    # Add some messages to the conversation
    message_in1 = MessageCreate(
        role="user",
        content="First message",
    )
    message_in2 = MessageCreate(
        role="assistant",
        content="Second message",
    )
    await add_message_to_conversation(test_db, message_in1, test_conversation.id)
    await add_message_to_conversation(test_db, message_in2, test_conversation.id)
    
    messages = await get_messages_by_conversation(test_db, test_conversation.id)
    
    assert len(messages) == 2
    assert any(m.role == "user" and m.content == "First message" for m in messages)
    assert any(m.role == "assistant" and m.content == "Second message" for m in messages)


@pytest.mark.asyncio
async def test_get_conversation_with_messages(test_db: AsyncSession, test_user: User, test_conversation):
    """Test getting a conversation with its messages."""
    # Add some messages to the conversation
    message_in1 = MessageCreate(
        role="user",
        content="First message",
    )
    message_in2 = MessageCreate(
        role="assistant",
        content="Second message",
    )
    await add_message_to_conversation(test_db, message_in1, test_conversation.id)
    await add_message_to_conversation(test_db, message_in2, test_conversation.id)
    
    conversation = await get_conversation_with_messages(test_db, test_conversation.id, test_user.id)
    
    assert conversation is not None
    assert conversation.id == test_conversation.id
    assert len(conversation.messages) == 2
    assert any(m.role == "user" and m.content == "First message" for m in conversation.messages)
    assert any(m.role == "assistant" and m.content == "Second message" for m in conversation.messages)

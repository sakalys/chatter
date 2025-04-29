#!/usr/bin/env python3
import asyncio
import os
from pathlib import Path
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User
from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.mcp_config import MCPConfig
from app.schemas.user import UserCreate
from app.services.user import create_user, get_user_by_email
from app.services.api_key import create_api_key
from app.schemas.api_key import ApiKeyCreate

async def cleanup_database(db: AsyncSession) -> None:
    """Clean up all data from the database."""
    # Delete in correct order to respect foreign key constraints
    print("Cleaning up database...")
    
    # Delete messages first as they depend on conversations
    await db.execute(delete(Message))
    print("Cleaned messages table")
    
    # Delete conversations as they depend on users
    await db.execute(delete(Conversation))
    print("Cleaned conversations table")
    
    # Delete API keys as they depend on users
    await db.execute(delete(ApiKey))
    print("Cleaned api_keys table")
    
    # Delete MCP configs as they depend on users
    await db.execute(delete(MCPConfig))
    print("Cleaned mcp_configs table")
    
    # Delete users last as other tables depend on them
    await db.execute(delete(User))
    print("Cleaned users table")
    
    # Commit the transaction
    await db.commit()
    print("Database cleanup completed!")

async def create_test_user(db: AsyncSession) -> User:
    """Create a test user if it doesn't exist."""
    test_user_email = "test@example.com"
    
    user_in = UserCreate(
        id='9d9b8ccf-4c09-48bf-adf0-ded3423650a4',
        email=test_user_email,
        password="testpassword",
        full_name="Test User",
    )
    user = await create_user(db, user_in)
    print(f"Created test user: {user.email}")
    
    return user

async def create_openai_api_key(db: AsyncSession, user: User) -> None:
    # Check if user already has a Google API key using async query
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.user_id == user.id,
            ApiKey.provider == "openai"
        )
    )
    existing_key = result.scalar_one_or_none()
    
    if existing_key:
        return
    
    # Read the API key from the gitignored file
    api_key_path = Path(__file__).parent / "openai_api_key.txt"
    if not api_key_path.exists():
        print(f"Error: API key file not found at {api_key_path}")
        return
    
    api_key = api_key_path.read_text().strip()
    if not api_key:
        print("Error: API key file is empty")
        return
    
    # Create the API key
    api_key_in = ApiKeyCreate(
        provider="openai",
        name="OpenAI API Key",
        key=api_key,
    )
    
    await create_api_key(db, api_key_in, user.id)
    print("Created OpenAI API key for test user")

async def create_google_api_key(db: AsyncSession, user: User) -> None:
    """Create a Google API key for the test user."""
    # Check if user already has a Google API key using async query
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.user_id == user.id,
            ApiKey.provider == "google"
        )
    )
    existing_key = result.scalar_one_or_none()
    
    if existing_key:
        print("Google API key already exists for test user")
        return
    
    # Read the API key from the gitignored file
    api_key_path = Path(__file__).parent / "google_api_key.txt"
    if not api_key_path.exists():
        print(f"Error: API key file not found at {api_key_path}")
        print("Please create the file with your Google API key")
        return
    
    api_key = api_key_path.read_text().strip()
    if not api_key:
        print("Error: API key file is empty")
        return
    
    # Create the API key
    api_key_in = ApiKeyCreate(
        provider="google",
        name="Google API Key",
        key=api_key,
    )
    
    await create_api_key(db, api_key_in, user.id)
    print("Created Google API key for test user")

async def create_example_conversation(db: AsyncSession, user: User) -> None:
    """Create an example conversation with messages for the test user."""
    print("Creating example conversation...")
    
    # Create a new conversation
    conversation = Conversation(user_id=user.id, title="Example Conversation")
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    print(f"Created conversation: {conversation.title}")
    
    # Create example messages
    messages_data = [
        {"content": "Hello! How can I help you today?", "role": "assistant"},
        {"content": "Hi there! I'd like to know more about creating fixtures.", "role": "user"},
        {"content": "Fixtures are used to populate a database with test data. In this project, we use SQLAlchemy.", "role": "assistant"},
        {"content": "That's helpful. How do I run the fixture script?", "role": "user"},
        {"content": "You can run the `create_fixtures.py` script directly using Python.", "role": "assistant"},
    ]
    
    for msg_data in messages_data:
        message = Message(
            conversation_id=conversation.id,
            content=msg_data["content"],
            role=msg_data["role"],
        )
        db.add(message)
    
    await db.commit()
    print(f"Added {len(messages_data)} messages to the conversation.")

async def main():
    """Main function to create all fixtures."""
    # Create database engine
    engine = create_async_engine(settings.database_url)
    
    # Create async session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as db:
        # Clean up existing data
        await cleanup_database(db)
        
        # Create test user
        user = await create_test_user(db)
        
        # Create Google API key
        await create_google_api_key(db, user)

        # Create OpenAI API key
        await create_openai_api_key(db, user)
        
        # Create example conversation
        await create_example_conversation(db, user)
    
    print("Fixtures creation completed!")

if __name__ == "__main__":
    asyncio.run(main())

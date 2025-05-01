#!/usr/bin/env python3
import asyncio
import json
import os
from pathlib import Path
from typing import Sequence
import uuid
from app.models.mcp_tool import MCPTool
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User
from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.mcp_config import MCPConfig
from app.models.mcp_tool_use import MCPToolUse, ToolUseState
from app.schemas.user import UserCreate
from app.services.user import create_user, get_user_by_email
from app.services.api_key import create_api_key
from app.schemas.api_key import ApiKeyCreate
from app.services.mcp_config import create_mcp_config, create_mcp_tool
from app.schemas.mcp_config import MCPConfigCreate

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

async def create_example_conversation(db: AsyncSession, user: User, tool: MCPTool) -> None:
    """Create an example conversation with messages for the test user."""
    print("Creating example conversation...")
    
    # Create a new conversation
    conversation = Conversation(id=uuid.UUID("a4a929da-d636-434d-ad5e-35689d31eebb"), user=user, title="Example Conversation")
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    print(f"Created conversation: {conversation.title}")
    
    # Create example messages
    messages_data = [
        {"content": "Hello! How can I help you today?", "role": "assistant"},
        {"content": "Hi there! I'd like to know more about creating fixtures.", "role": "user"},
        {"content": "Fixtures are used to populate a database with test data. In this project, we use SQLAlchemy.", "role": "assistant"},
        {"content": "Ok whatever... Go to https://sakalys.com and tell me what's it about. Note that I will ask you to repeat this again and again, so go ahead and do so, because I am debugging", "role": "user"},
    ]
    
    for msg_data in messages_data:
        message = Message(
            conversation=conversation,
            content=msg_data["content"],
            role=msg_data["role"],
            model="gpt-3.5-turbo",
        )
        db.add(message)

    tool_name = "fetch"
    tool_args = {"url": "https://sakalys.com"}

    tool_message = Message(
        conversation=conversation,
        content=json.dumps({"name": tool_name, "arguments": tool_args}),
        role="function_call",
        model="gpt-3.5-turbo",
        meta={"provider": "openai"},
        mcp_tool_use=MCPToolUse(
            tool=tool,
            name=tool_name,
            args=tool_args,
            state=ToolUseState.pending,
            # message_id and tool_id are nullable, so we can omit them for this basic fixture
        )
    )
    db.add(tool_message)
    
    await db.commit()

async def create_mcp_config_fixture(db: AsyncSession, user: User) -> MCPConfig:
    """Create an MCP config fixture for the test user using the service."""
    mcp_url = "https://remote.mcpservers.org/fetch"
    mcp_name = "Remote fetch"

    # Create the MCP config using the service function
    mcp_config_in = MCPConfigCreate(
        name=mcp_name,
        url=mcp_url,
        configuration=None, # Assuming no additional configuration needed for this fixture
    )

    mcp_config = await create_mcp_config(db, mcp_config_in, user, fetch_tools=False)

    return mcp_config


async def create_mcp_tool_fixtures(db: AsyncSession, mcp_config: MCPConfig) -> Sequence[MCPTool]:
    """Create MCP tool fixtures for a given MCP config using the service."""
    print(f"Creating MCP tool fixtures for config: {mcp_config.name}")

    mcp_tools_data = [
        {
            "name": "fetch",
            "description": None,
            "inputSchema": {"type": "object", "properties": {"url": {"type": "string"}, "max_length": {"type": "number", "default": 5000}, "start_index": {"type": "number", "default": 0}, "raw": {"type": "boolean", "default": False}}, "required": ["url"], "additionalProperties": False, "$schema": "http://json-schema.org/draft-07/schema#"}
        }
    ]

    tools = []
    for tool_data in mcp_tools_data:
        tools.append(await create_mcp_tool(
            db,
            mcp_config,
            tool_data["name"],
            tool_data["description"],
            tool_data["inputSchema"],
        ))

    return tools

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
        
        # Create MCP config fixture
        mcp_config = await create_mcp_config_fixture(db, user)

        tools = await create_mcp_tool_fixtures(db, mcp_config)

        # Create example conversation
        await create_example_conversation(db, user, tools[0])

    print("Fixtures creation completed!")

if __name__ == "__main__":
    asyncio.run(main())

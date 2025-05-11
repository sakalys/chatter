from typing import Literal
import httpx
from result import Ok, Err, Result, is_ok, is_err
from uuid import UUID

from app.models.mcp_tool import MCPTool
from app.models.user import User
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp_config import MCPConfig
from app.schemas.mcp_config import MCPConfigCreate, MCPConfigUpdate
from app.schemas.mcp_tool import McpTool # Import McpTool schema

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def get_mcp_configs_by_user(
    db: AsyncSession,
    user: User,
) -> list[MCPConfig]:
    """
    Get all MCP configurations for a user.
    
    Args:
        db: Database session
        user: User object
        
    Returns:
        List of MCP configuration objects
    """
    result = await db.execute(select(MCPConfig).where(MCPConfig.user_id == user.id))
    return list(result.scalars().all()) # Cast to list


async def get_mcp_config_by_id_and_user_id(
    db: AsyncSession,
    mcp_config_id: UUID,
    user_id: UUID,
) -> MCPConfig | None:
    """
    Get an MCP configuration by ID for a specific user.
    
    Args:
        db: Database session
        mcp_config_id: MCP configuration ID
        user_id: User ID
        
    Returns:
        MCP configuration object or None if not found
    """
    result = await db.execute(
        select(MCPConfig).where(
            MCPConfig.id == mcp_config_id,
            MCPConfig.user_id == user_id
        )
    )
    return result.scalars().first()


async def create_mcp_config(
    db: AsyncSession,
    mcp_config_in: MCPConfigCreate,
    user: User,
    fetch_tools: bool = True,
) -> Result[MCPConfig, str]:
    """
    Create a new MCP configuration.

    Args:
        db: Database session
        mcp_config_in: MCP configuration creation data
        user: The user creating the configuration
        fetch_tools: Whether to fetch tools after creating the config

    Returns:
        Created MCP configuration object
    """
    mcp_config = MCPConfig(
        user=user,
        name=mcp_config_in.name,
        url=mcp_config_in.url,
        configuration=mcp_config_in.configuration,
    )

    if fetch_tools:
        result = await update_tools(db, mcp_config)

        if result.is_err():
            return Err(str(result.err()))

    db.add(mcp_config)
    await db.commit()
    await db.refresh(mcp_config)

    return Ok(mcp_config)


async def update_mcp_config(
    db: AsyncSession, mcp_config: MCPConfig, mcp_config_in: MCPConfigUpdate
) -> Result[MCPConfig, str]:
    """
    Update an MCP configuration.
    
    Args:
        db: Database session
        mcp_config: MCP configuration object to update
        mcp_config_in: MCP configuration update data
        
    Returns:
        Updated MCP configuration object
    """
    update_data = mcp_config_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(mcp_config, field, value)

    result = await update_tools(db, mcp_config)
    
    if result.is_err():
        return Err(str(result.err()))

    await db.commit()
    await db.refresh(mcp_config)

    return Ok(mcp_config)

class UpdateToolsException(Exception):
    pass

async def update_tools(db: AsyncSession, mcp_config: MCPConfig) -> Result[Literal[True], str]:
    """
    Update the tools for an MCP configuration.
    
    Args:
        db: Database session
        mcp_config: MCP configuration object
    """
    url_error = False
    try:
        async with streamablehttp_client(mcp_config.url) as (readable_stream, writable_stream, _):
            async with ClientSession(readable_stream, writable_stream) as session:
                await session.initialize()

                result = await session.list_tools()

                # Delete existing tools
                await db.execute(delete(MCPTool).where(MCPTool.mcp_config_id == mcp_config.id))

                # Add new tools
                for tool_data in result.tools:
                    tool = MCPTool(
                        mcp_config=mcp_config,
                        name=tool_data.name,
                        description=tool_data.description,
                        inputSchema=tool_data.inputSchema,
                    )
                    db.add(tool)

                await db.commit()

    except* (httpx.HTTPError) as e:
        url_error = True

    if url_error:
        return Err("Server URL does not seem to be a valid SSE url")

    return Ok(True)

async def create_mcp_tool(
    db: AsyncSession,
    mcp_config: MCPConfig,
    name: str,
    description: str | None,
    inputSchema: dict,
) -> MCPTool:
    """
    Create a new MCP tool for a given MCP configuration.

    Args:
        db: Database session
        mcp_config: The MCP configuration the tool belongs to
        name: The name of the tool
        description: The description of the tool
        inputSchema: The input schema for the tool

    Returns:
        The created Tool object
    """
    tool = MCPTool(
        mcp_config=mcp_config,
        name=name,
        description=description,
        inputSchema=inputSchema,
    )

    db.add(tool)
    await db.commit()
    await db.refresh(tool)

    return tool


async def delete_mcp_config(
    db: AsyncSession, mcp_config: MCPConfig
) -> None:
    """
    Delete an MCP configuration.
    
    Args:
        db: Database session
        mcp_config: MCP configuration object to delete
    """
    await db.delete(mcp_config)
    await db.commit()

async def get_available_mcp_tools(
    db: AsyncSession,
    user: User,
    config_id: UUID | None = None, # Add optional config_id parameter
) -> list[McpTool]:
    """
    Get all available MCP tools from configured MCP servers for the current user,
    optionally filtered by MCP configuration ID.

    Args:
        db: Database session
        user: The current user
        config_id: Optional MCP configuration ID to filter by

    Returns:
        A list of McpTool objects
    """
    # Fetch all MCP configurations for the user
    # If config_id is provided, only fetch that specific config to update its tools
    if config_id:
        mcp_configs = []
        config = await get_mcp_config_by_id_and_user_id(db, config_id, user.id)
        if config:
            mcp_configs.append(config)
    else:
        mcp_configs = await get_mcp_configs_by_user(db, user)


    # Fetch all tools associated with the user's configurations from the database
    query = select(MCPTool).join(MCPConfig).where(MCPConfig.user_id == user.id)
    if config_id:
        query = query.where(MCPTool.mcp_config_id == config_id) # Filter by config_id if provided

    result = await db.execute(query)
    tools = result.scalars().all()

    # Convert database models to schema models
    schema_tools = [
        McpTool(
            name=tool.name,
            description=tool.description or "", # Ensure description is a string
            server=tool.mcp_config.name # Use the config name as the server identifier
        )
        for tool in tools
    ]

    return schema_tools

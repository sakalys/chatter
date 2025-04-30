from uuid import UUID

from app.models.mcp_tool import Tool
from app.models.user import User
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp_config import MCPConfig
from app.schemas.mcp_config import MCPConfigCreate, MCPConfigUpdate

from mcp import ClientSession
from mcp.client.sse import sse_client

async def get_mcp_configs_by_user(
    db: AsyncSession,
    user: User,
) -> list[MCPConfig]:
    """
    Get all MCP configurations for a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of MCP configuration objects
    """
    result = await db.execute(select(MCPConfig).where(MCPConfig.user_id == user.id))
    return result.scalars().all()


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
) -> MCPConfig:
    """
    Create a new MCP configuration.
    
    Args:
        db: Database session
        mcp_config_in: MCP configuration creation data
        user_id: User ID
        
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
        await update_tools(db, mcp_config)

    db.add(mcp_config)
    await db.commit()
    await db.refresh(mcp_config)

    return mcp_config


async def update_mcp_config(
    db: AsyncSession, mcp_config: MCPConfig, mcp_config_in: MCPConfigUpdate
) -> MCPConfig:
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

    await update_tools(db, mcp_config)

    await db.commit()
    await db.refresh(mcp_config)
    return mcp_config

async def update_tools(db: AsyncSession, mcp_config: MCPConfig) -> None:
    """
    Update the tools for an MCP configuration.
    
    Args:
        db: Database session
        mcp_config: MCP configuration object
    """
    async with sse_client(mcp_config.url) as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()

            result = await session.list_tools()

            # Delete existing tools
            await db.execute(delete(Tool).where(Tool.mcp_config_id == mcp_config.id))

            # Add new tools
            for tool_data in result.tools:
                tool = Tool(
                    mcp_config_id=mcp_config.id,
                    name=tool_data.name,
                    description=tool_data.description,
                    inputSchema=tool_data.inputSchema,
                )
                db.add(tool)

            await db.commit()


async def create_mcp_tool(
    db: AsyncSession,
    mcp_config: MCPConfig,
    name: str,
    description: str | None,
    inputSchema: dict,
) -> Tool:
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
    tool = Tool(
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

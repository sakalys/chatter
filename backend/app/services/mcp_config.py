from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp_config import MCPConfig
from app.schemas.mcp_config import MCPConfigCreate, MCPConfigUpdate


async def get_mcp_configs_by_user(
    db: AsyncSession, user_id: UUID
) -> List[MCPConfig]:
    """
    Get all MCP configurations for a user.
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        List of MCP configuration objects
    """
    result = await db.execute(select(MCPConfig).where(MCPConfig.user_id == user_id))
    return result.scalars().all()


async def get_mcp_config_by_id(
    db: AsyncSession, mcp_config_id: UUID, user_id: UUID
) -> Optional[MCPConfig]:
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
    db: AsyncSession, mcp_config_in: MCPConfigCreate, user_id: UUID
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
        user_id=user_id,
        name=mcp_config_in.name,
        url=mcp_config_in.url,
        configuration=mcp_config_in.configuration,
    )
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
    
    await db.commit()
    await db.refresh(mcp_config)
    return mcp_config


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

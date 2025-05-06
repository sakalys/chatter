from typing import Annotated, Any
from uuid import UUID

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.schemas.mcp_config import MCPConfigCreate, MCPConfigResponse, MCPConfigUpdate
from app.schemas.mcp_tool import McpTool  # Import McpTool schema
from app.services.mcp_config import (
    create_mcp_config,
    delete_mcp_config,
    get_mcp_config_by_id_and_user_id,
    get_mcp_configs_by_user,
    update_mcp_config,
    get_available_mcp_tools, # Import the new service function
)
from result import is_err

router = APIRouter()

@router.get("/tools", response_model=list[McpTool])
async def read_available_mcp_tools(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
    config_id: UUID | None = None, # Add optional config_id query parameter
):
    """
    Get all available MCP tools from configured MCP servers for the current user,
    optionally filtered by MCP configuration ID.
    """
    tools = await get_available_mcp_tools(db, current_user, config_id=config_id) # Pass config_id to service function
    return tools


@router.get("", response_model=list[MCPConfigResponse])
async def read_mcp_configs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get all MCP configurations for the current user.
    """
    mcp_configs = await get_mcp_configs_by_user(db, current_user)
    return mcp_configs


@router.post("", response_model=MCPConfigResponse)
async def create_user_mcp_config(
    mcp_config_in: MCPConfigCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Create a new MCP configuration for the current user.
    """
    mcp_config = await create_mcp_config(db, mcp_config_in, current_user)
    return mcp_config


@router.get("/{mcp_config_id}", response_model=MCPConfigResponse)
async def read_mcp_config(
    mcp_config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get a specific MCP configuration by id.
    """
    mcp_config = await get_mcp_config_by_id_and_user_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    return mcp_config


@router.put("/{mcp_config_id}", response_model=MCPConfigResponse)
async def update_user_mcp_config(
    mcp_config_id: UUID,
    mcp_config_in: MCPConfigUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Update a specific MCP configuration.
    """
    mcp_config = await get_mcp_config_by_id_and_user_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    result = await update_mcp_config(db, mcp_config, mcp_config_in)
    if is_err(result):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.err_value,
        )

    return mcp_config


@router.delete("/{mcp_config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_mcp_config(
    mcp_config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Delete a specific MCP configuration.
    """
    mcp_config = await get_mcp_config_by_id_and_user_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    await delete_mcp_config(db, mcp_config)

from typing import Annotated, Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.schemas.mcp_config import MCPConfigCreate, MCPConfigResponse, MCPConfigUpdate
from app.services.mcp import call_mcp_tool, access_mcp_resource, list_mcp_tools, list_mcp_resources
from app.services.mcp_config import (
    create_mcp_config, delete_mcp_config, get_mcp_config_by_id, get_mcp_configs_by_user, update_mcp_config
)

router = APIRouter()


@router.get("/", response_model=List[MCPConfigResponse])
async def read_mcp_configs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get all MCP configurations for the current user.
    """
    mcp_configs = await get_mcp_configs_by_user(db, current_user.id)
    return mcp_configs


@router.post("/", response_model=MCPConfigResponse)
async def create_user_mcp_config(
    mcp_config_in: MCPConfigCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Create a new MCP configuration for the current user.
    """
    mcp_config = await create_mcp_config(db, mcp_config_in, current_user.id)
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
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
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
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    mcp_config = await update_mcp_config(db, mcp_config, mcp_config_in)
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
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    await delete_mcp_config(db, mcp_config)


@router.get("/{mcp_config_id}/tools", response_model=List[Dict[str, Any]])
async def read_mcp_tools(
    mcp_config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    List all tools available from an MCP server.
    """
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    tools = await list_mcp_tools(mcp_config)
    return tools


@router.get("/{mcp_config_id}/resources", response_model=List[Dict[str, Any]])
async def read_mcp_resources(
    mcp_config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    List all resources available from an MCP server.
    """
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    resources = await list_mcp_resources(mcp_config)
    return resources


@router.post("/{mcp_config_id}/tools/{tool_name}", response_model=Dict[str, Any])
async def use_mcp_tool(
    mcp_config_id: UUID,
    tool_name: str,
    arguments: Dict[str, Any],
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Call an MCP tool.
    """
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    result = await call_mcp_tool(mcp_config, tool_name, arguments)
    return result


@router.get("/{mcp_config_id}/resources/{resource_uri:path}", response_model=Dict[str, Any])
async def access_mcp_resource_endpoint(
    mcp_config_id: UUID,
    resource_uri: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Access an MCP resource.
    """
    mcp_config = await get_mcp_config_by_id(db, mcp_config_id, current_user.id)
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    
    result = await access_mcp_resource(mcp_config, resource_uri)
    return result

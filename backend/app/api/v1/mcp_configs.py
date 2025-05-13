from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from result import is_err

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.schemas.mcp_config import MCPConfigCreate, MCPConfigResponse, MCPConfigUpdate
from app.schemas.mcp_tool import McpTool
from app.services.mcp_config import (
    create_mcp_config,
    delete_mcp_config,
    get_available_mcp_tools,
    get_mcp_config_by_id_and_user_id,
    get_mcp_configs_by_user,
    update_mcp_config,
)
from app.services.preconfigured_mcp_config import (
    create_preconfigured_config,
    get_preconfigured_config_by_code_and_user_id,
    get_preconfigured_configs_by_user,
    update_tools,
)

router = APIRouter()


@router.get("/tools", response_model=list[McpTool])
async def read_available_mcp_tools(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
    config_id: UUID | None = None,
):
    """
    Get all available MCP tools from configured MCP servers for the current user,
    optionally filtered by MCP configuration ID.
    """
    tools = await get_available_mcp_tools(
        db, current_user, config_id=config_id
    )  # Pass config_id to service function
    return tools


class PreconfiguredMCPTool(BaseModel):
    name: str
    description: str | None = None


class PreconfiguredMCPConfig(BaseModel):
    code: str
    enabled: bool
    tools: list[PreconfiguredMCPTool] = []


@router.get("/preconfigured", response_model=list[PreconfiguredMCPConfig])
async def read_preconfigured_configs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get all available MCP tools from configured MCP servers for the current user,
    optionally filtered by MCP configuration ID.
    """
    tools = await get_preconfigured_configs_by_user(
        db,
        current_user,
    )
    return tools


class TogglePreconfiguredMCPConfigResponse(BaseModel):
    id: UUID
    enabled: bool
    tools: list[PreconfiguredMCPTool]


class PreconfiguredToggle(BaseModel):
    enabled: bool


@router.post("/preconfigured/{code}/toggle", response_model=PreconfiguredMCPConfig)
async def toggle_preconfigured(
    toggle_data: PreconfiguredToggle,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
    code: str,
):
    config = await get_preconfigured_config_by_code_and_user_id(
        db,
        code,
        current_user.id,
    )

    if not config:
        result = await create_preconfigured_config(
            db=db,
            user=current_user,
            enabled=toggle_data.enabled,
            code=code,
        )

        config = result.unwrap()


    config.enabled = toggle_data.enabled

    if toggle_data.enabled:
        await update_tools(db, config)

    await db.commit()
    await db.refresh(config)

    return config


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
    result = await create_mcp_config(db, mcp_config_in, current_user)

    if is_err(result):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.err_value,
        )

    return result.unwrap()


@router.get("/{config_id}", response_model=MCPConfigResponse)
async def read_mcp_config(
    config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get a specific MCP configuration by id.
    """
    mcp_config = await get_mcp_config_by_id_and_user_id(
        db, config_id, current_user.id
    )
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )
    return mcp_config


@router.get("/{config_id}/tools", response_model=list[McpTool])
async def get_config_tools(
    config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    return await read_available_mcp_tools(current_user, db, config_id)


@router.put("/{config_id}", response_model=MCPConfigResponse)
async def update_user_mcp_config(
    config_id: UUID,
    mcp_config_in: MCPConfigUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Update a specific MCP configuration.
    """
    mcp_config = await get_mcp_config_by_id_and_user_id(
        db, config_id, current_user.id
    )
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


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_mcp_config(
    config_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Delete a specific MCP configuration.
    """
    mcp_config = await get_mcp_config_by_id_and_user_id(
        db, config_id, current_user.id
    )
    if not mcp_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MCP configuration not found",
        )

    await delete_mcp_config(db, mcp_config)

from typing import Any

import httpx
from fastapi import HTTPException, status

from app.models.mcp_config import MCPConfig


async def call_mcp_tool(
    mcp_config: MCPConfig,
    tool_name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    pass


async def access_mcp_resource(
    mcp_config: MCPConfig,
    resource_uri: str,
) -> dict[str, Any]:
    pass

async def get_mcp_server_info(
    mcp_config: MCPConfig,
) -> dict[str, Any]:
    pass


async def list_mcp_tools(
    mcp_config: MCPConfig,
) -> list[dict[str, Any]]:
    pass


async def list_mcp_resources(
    mcp_config: MCPConfig,
) -> list[dict[str, Any]]:
    pass

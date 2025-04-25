import json
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, status

from app.models.mcp_config import MCPConfig


async def call_mcp_tool(
    mcp_config: MCPConfig,
    tool_name: str,
    arguments: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Call an MCP tool.
    
    Args:
        mcp_config: MCP configuration
        tool_name: Name of the tool to call
        arguments: Arguments for the tool
        
    Returns:
        Response from the MCP tool
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
        }
        
        # Add any custom headers from the configuration
        if mcp_config.configuration and "headers" in mcp_config.configuration:
            headers.update(mcp_config.configuration["headers"])
        
        data = {
            "tool_name": tool_name,
            "arguments": arguments,
        }
        
        try:
            response = await client.post(
                f"{mcp_config.url}/tools",
                headers=headers,
                json=data,
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error from MCP server: {response.text}"
                )
            
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to MCP server: {str(e)}"
            )


async def access_mcp_resource(
    mcp_config: MCPConfig,
    resource_uri: str,
) -> Dict[str, Any]:
    """
    Access an MCP resource.
    
    Args:
        mcp_config: MCP configuration
        resource_uri: URI of the resource to access
        
    Returns:
        Response from the MCP resource
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
        }
        
        # Add any custom headers from the configuration
        if mcp_config.configuration and "headers" in mcp_config.configuration:
            headers.update(mcp_config.configuration["headers"])
        
        try:
            response = await client.get(
                f"{mcp_config.url}/resources/{resource_uri}",
                headers=headers,
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error from MCP server: {response.text}"
                )
            
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to MCP server: {str(e)}"
            )


async def get_mcp_server_info(
    mcp_config: MCPConfig,
) -> Dict[str, Any]:
    """
    Get information about an MCP server.
    
    Args:
        mcp_config: MCP configuration
        
    Returns:
        Information about the MCP server
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
        }
        
        # Add any custom headers from the configuration
        if mcp_config.configuration and "headers" in mcp_config.configuration:
            headers.update(mcp_config.configuration["headers"])
        
        try:
            response = await client.get(
                f"{mcp_config.url}/info",
                headers=headers,
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error from MCP server: {response.text}"
                )
            
            return response.json()
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to MCP server: {str(e)}"
            )


async def list_mcp_tools(
    mcp_config: MCPConfig,
) -> List[Dict[str, Any]]:
    """
    List all tools available from an MCP server.
    
    Args:
        mcp_config: MCP configuration
        
    Returns:
        List of tools available from the MCP server
    """
    server_info = await get_mcp_server_info(mcp_config)
    return server_info.get("tools", [])


async def list_mcp_resources(
    mcp_config: MCPConfig,
) -> List[Dict[str, Any]]:
    """
    List all resources available from an MCP server.
    
    Args:
        mcp_config: MCP configuration
        
    Returns:
        List of resources available from the MCP server
    """
    server_info = await get_mcp_server_info(mcp_config)
    return server_info.get("resources", [])

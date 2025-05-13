from typing import Literal
from uuid import UUID

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from result import Ok, Result, Err
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.preconfigured_mcp_config import PreconfiguredMCPConfig
from app.models.preconfigured_mcp_tool import PreconfiguredMCPTool
from app.models.user import User


async def get_preconfigured_configs_by_user(
    db: AsyncSession,
    user: User,
) -> list[PreconfiguredMCPConfig]:
    """
    Get all preconfigured MCP configurations for a user.

    Args:
        db: Database session
        user: User object

    Returns:
        List of preconfigured MCP configuration objects
    """
    result = await db.execute(
        select(PreconfiguredMCPConfig)
        .where(PreconfiguredMCPConfig.user_id == user.id)
        .options(joinedload(PreconfiguredMCPConfig.tools))
    )

    return list(result.scalars().unique().all())  # Cast to list


async def get_preconfigured_config_by_code_and_user_id(
    db: AsyncSession,
    code: str,
    user_id: UUID,
) -> PreconfiguredMCPConfig | None:
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
        select(PreconfiguredMCPConfig)
        .where(
            PreconfiguredMCPConfig.code == code,
            PreconfiguredMCPConfig.user_id == user_id,
        )
    )
    return result.scalars().first()


async def create_preconfigured_config(
    db: AsyncSession,
    user: User,
    enabled: bool,
    code: str,
) -> Result[PreconfiguredMCPConfig, str]:

    config = PreconfiguredMCPConfig(
        user=user,
        enabled=enabled,
        code=code,
    )

    # if fetch_tools:
    #     result = await update_tools(db, config)
    #
    #     if result.is_err():
    #         return Err(str(result.err()))

    db.add(config)
    await db.commit()
    await db.refresh(config)

    return Ok(config)


def get_preconfigured_url(code: str) -> str:
    match code:
        case "sequentialthinking":
            return "https://remote.mcpservers.org/sequentialthinking/mcp"
        case "fetch":
            return "https://remote.mcpservers.org/fetch/mcp"
        case _:
            raise


async def update_tools(db: AsyncSession, config: PreconfiguredMCPConfig) -> Result[Literal[True], str]:
    url_error = False
    try:
        async with streamablehttp_client(get_preconfigured_url(config.code)) as (readable_stream, writable_stream, _):
            async with ClientSession(readable_stream, writable_stream) as session:
                await session.initialize()

                result = await session.list_tools()

                # Delete existing tools
                await db.execute(delete(PreconfiguredMCPTool).where(PreconfiguredMCPTool.preconfigured_mcp_config_id == config.id))

                # Add new tools
                for tool_data in result.tools:
                    tool = PreconfiguredMCPTool(
                        preconfigured_mcp_config=config,
                        name=tool_data.name,
                        description=tool_data.description if tool_data.description else ("Fetch a URL and extract its contents as markdown" if config.code == "fetch" else None),
                        inputSchema=tool_data.inputSchema,
                    )
                    db.add(tool)

                await db.commit()

    except* (httpx.HTTPError) as e:
        url_error = True

    if url_error:
        return Err("Server URL does not seem to be a valid SSE url")

    return Ok(True)

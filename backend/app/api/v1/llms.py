from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.schemas.mcp_config import MCPConfigResponse
from app.models.mcp_config import MCPConfig
from app.models.user import User
from app.services.api_key import get_api_keys_by_user

router = APIRouter()

@router.get("/configured", response_model=List[MCPConfigResponse])
async def get_configured_llms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
  """
  Get a list of configured LLMs for the current user based on available API keys.
  """
  # Fetch all MCP configs for the current user asynchronously
  result = await db.execute(select(MCPConfig).where(MCPConfig.user_id == current_user.id))
  mcp_configs = result.scalars().all() # Correctly fetch all results asynchronously

  # Fetch configured API keys for the current user
  api_keys = await get_api_keys_by_user(db, current_user.id)
  configured_providers = {key.provider for key in api_keys}

  # Filter for configurations that represent LLMs and have a configured API key
  configured_llms = [
      config for config in mcp_configs
      if config.configuration and config.configuration.get("type") == "llm" and
         # Assuming provider can be identified from the MCP config URL or configuration
         any(provider in (config.url.lower() if config.url else "") or (config.configuration.get("provider") == provider if config.configuration else False) for provider in configured_providers)
  ]

  return configured_llms

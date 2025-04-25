from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MCPConfigBase(BaseModel):
    """Base MCP configuration schema."""
    name: str
    url: str
    configuration: dict[str, Any] | None = None


class MCPConfigCreate(MCPConfigBase):
    """MCP configuration creation schema."""
    pass


class MCPConfigUpdate(BaseModel):
    """MCP configuration update schema."""
    name: str | None = None
    url: str | None = None
    configuration: dict[str, Any] | None = None


class MCPConfigResponse(MCPConfigBase):
    """MCP configuration response schema."""
    id: UUID
    user_id: UUID
    
    model_config = ConfigDict(from_attributes=True)

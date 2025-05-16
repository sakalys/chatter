from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, validator

from app.models.mcp_config import MCPConfigType


class MCPConfigBase(BaseModel):
    """Base MCP configuration schema."""

    name: str
    url: str
    # TODO: make without default
    type: MCPConfigType | None = None

    @field_validator('type')
    def set_type_default(cls, v):
        return v or MCPConfigType.StreamableHTTP


class MCPConfigCreate(MCPConfigBase):
    """MCP configuration creation schema."""

    pass


class MCPConfigUpdate(BaseModel):
    """MCP configuration update schema."""

    name: str | None = None
    url: str | None = None
    type: MCPConfigType | None = None


class MCPConfigResponse(MCPConfigBase):
    """MCP configuration response schema."""

    id: UUID
    user_id: UUID
    code: str

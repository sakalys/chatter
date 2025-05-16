from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.mcp_config import MCPConfigType


class MCPConfigBase(BaseModel):
    """Base MCP configuration schema."""

    name: str
    url: str
    type: MCPConfigType


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

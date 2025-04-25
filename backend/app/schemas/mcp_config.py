from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class MCPConfigBase(BaseModel):
    """Base MCP configuration schema."""
    name: str
    url: str
    configuration: Optional[Dict[str, Any]] = None


class MCPConfigCreate(MCPConfigBase):
    """MCP configuration creation schema."""
    pass


class MCPConfigUpdate(BaseModel):
    """MCP configuration update schema."""
    name: Optional[str] = None
    url: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None


class MCPConfigResponse(MCPConfigBase):
    """MCP configuration response schema."""
    id: UUID
    user_id: UUID
    
    class Config:
        from_attributes = True

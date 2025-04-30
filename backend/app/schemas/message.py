from typing import Annotated, Any, Optional
from uuid import UUID

from app.models.mcp_tool import MCPTool
from pydantic import BaseModel, ConfigDict, Field

class ToolUseBase(BaseModel):
    """Base message schema."""
    name: str = Field(..., description="Tool name")
    args: dict = Field(..., description="Tool arguments")

class ToolUseCreate(ToolUseBase):
    """Tool use creation schema."""
    pass

class MessageBase(BaseModel):
    """Base message schema."""
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content in markdown format")
    model: str | None = Field(None, description="The model used for this message (if assistant)")
    meta: dict[str, Any] | None = Field(None, description="Additional metadata")

class MessageCreate(MessageBase):
    """Message creation schema."""
    pass
    tool_use: ToolUseCreate | None = Field(None, description="Tool use information")


class MessageResponse(MessageBase):
    """Message response schema."""
    id: UUID
    conversation_id: UUID
    
    model_config = ConfigDict(from_attributes=True)

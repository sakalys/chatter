from typing import Annotated, Any, Optional
from uuid import UUID

from app.models.mcp_tool import MCPTool
from pydantic import BaseModel, Field

class ToolUseBase(BaseModel):
    """Base message schema."""
    name: str = Field(..., description="Tool name")
    args: dict = Field(..., description="Tool arguments")

class ToolUseCreate(ToolUseBase):
    """Tool use creation schema."""
    pass

class ToolUseResponse(ToolUseBase):
    approved: bool = Field(..., description="Whether the tool use was approved")

class MessageBase(BaseModel):
    """Base message schema."""
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content in markdown format")
    model: str | None = Field(None, description="The model used for this message (if assistant)")
    meta: dict[str, Any] | None = Field(None, description="Additional metadata")
    tool_use: Annotated[Optional[ToolUseResponse], Field(..., description="Tool use information", alias="mcp_tool_use")] = None

class MessageCreate(MessageBase):
    """Message creation schema."""
    tool_use: Annotated[Optional[ToolUseCreate], Field(None, description="Tool use information")] = None


class MessageResponse(MessageBase):
    """Message response schema."""
    id: UUID
    conversation_id: UUID

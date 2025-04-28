from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MessageBase(BaseModel):
    """Base message schema."""
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content in markdown format")
    model: str | None = Field(None, description="The model used for this message (if assistant)")
    meta: dict[str, Any] | None = Field(None, description="Additional metadata")


class MessageCreate(MessageBase):
    """Message creation schema."""
    pass


class MessageResponse(MessageBase):
    """Message response schema."""
    id: UUID
    conversation_id: UUID
    
    model_config = ConfigDict(from_attributes=True)

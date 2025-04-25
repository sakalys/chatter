from typing import Any
from uuid import UUID

from pydantic import BaseModel


class MessageBase(BaseModel):
    """Base message schema."""
    role: str  # "user", "assistant", "system", etc.
    content: str
    model: str | None = None  # The model used for this message (if assistant)
    metadata: dict[str, Any] | None = None  # Additional metadata


class MessageCreate(MessageBase):
    """Message creation schema."""
    pass


class MessageResponse(MessageBase):
    """Message response schema."""
    id: UUID
    conversation_id: UUID
    
    class Config:
        from_attributes = True

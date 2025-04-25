from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MessageBase(BaseModel):
    """Base message schema."""
    role: str  # "user", "assistant", "system", etc.
    content: str
    model: Optional[str] = None  # The model used for this message (if assistant)
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata


class MessageCreate(MessageBase):
    """Message creation schema."""
    pass


class MessageResponse(MessageBase):
    """Message response schema."""
    id: UUID
    conversation_id: UUID
    
    class Config:
        from_attributes = True

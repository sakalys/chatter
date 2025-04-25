from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.message import MessageResponse


class ConversationBase(BaseModel):
    """Base conversation schema."""
    title: Optional[str] = None


class ConversationCreate(ConversationBase):
    """Conversation creation schema."""
    pass


class ConversationUpdate(ConversationBase):
    """Conversation update schema."""
    pass


class ConversationResponse(ConversationBase):
    """Conversation response schema."""
    id: UUID
    user_id: UUID
    
    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    """Detailed conversation response with messages."""
    messages: List[MessageResponse] = []
    
    class Config:
        from_attributes = True

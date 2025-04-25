from uuid import UUID

from pydantic import BaseModel

from app.schemas.message import MessageResponse


class ConversationBase(BaseModel):
    """Base conversation schema."""
    title: str | None = None


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
    messages: list[MessageResponse] = []
    
    class Config:
        from_attributes = True

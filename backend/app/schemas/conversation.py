from uuid import UUID

from pydantic import BaseModel, ConfigDict

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
    
    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationResponse):
    """Detailed conversation response with messages."""
    messages: list[MessageResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

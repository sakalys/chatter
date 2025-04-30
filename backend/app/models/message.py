from datetime import UTC, datetime
import uuid

from app.models.mcp_tool_use import MCPToolUse
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, types
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class Message(Base):
    """Model for storing chat messages."""

    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # "user", "assistant", "system", etc.
    content = Column(Text, nullable=False)
    model = Column(String, nullable=True)  # The model used for this message (if assistant)
    meta = Column(types.JSON, nullable=True)  # Additional metadata (tokens, model parameters, etc.)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None), nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    mcp_tool_use = relationship(MCPToolUse, back_populates="message", uselist=False, cascade="all, delete-orphan")

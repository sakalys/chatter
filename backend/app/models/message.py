from datetime import UTC, datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Text, types
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

import typing
if typing.TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.mcp_tool_use import MCPToolUse


class Message(Base):
    """Model for storing chat messages."""

    __tablename__ = "messages"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    role: Mapped[str] = mapped_column(nullable=False)  # "user", "assistant", "system", etc.
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str | None] = mapped_column(nullable=True)  # The model used for this message (if assistant)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC).replace(tzinfo=None), nullable=False)
    provider: Mapped[str] = mapped_column(nullable=True) # The provider of the message (e.g., "openai", "anthropic", "gemini")

    # Relationships
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    mcp_tool_use: Mapped["MCPToolUse | None"] = relationship(back_populates="message", uselist=False, lazy="joined", cascade="all, delete-orphan")

import datetime
import uuid

from sqlalchemy import ForeignKey, String, DateTime, func
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

from typing import List
import typing
if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.message import Message

class Conversation(Base):
    """Model for storing chat conversations."""
    
    __tablename__ = "conversations"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(nullable=True)  # Optional title for the conversation
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="conversations")
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    messages: Mapped[List["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")

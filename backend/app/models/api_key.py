import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

import typing
if typing.TYPE_CHECKING:
    from app.models.user import User


class ApiKey(Base):
    """Model for storing user API keys for different LLM providers."""
    
    __tablename__ = "api_keys"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(nullable=False)  # e.g., "openai", "anthropic", etc.
    key_reference: Mapped[str] = mapped_column(nullable=False)  # Reference to the encrypted key
    name: Mapped[str] = mapped_column(nullable=True)  # User-friendly name for the key
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="api_keys")

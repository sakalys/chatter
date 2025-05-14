import typing
import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if typing.TYPE_CHECKING:
    from app.models.user import User


class ApiKey(Base):
    """Model for storing user API keys for different LLM providers."""

    __tablename__ = "api_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_provider"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # e.g., "openai", "anthropic", etc.
    provider: Mapped[str] = mapped_column(nullable=False)
    # Reference to the encrypted key
    key_reference: Mapped[str] = mapped_column(nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="api_keys")
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

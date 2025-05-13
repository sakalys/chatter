import uuid

from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

import typing

if typing.TYPE_CHECKING:
    from app.models.api_key import ApiKey
    from app.models.conversation import Conversation
    from app.models.mcp_config import MCPConfig
    from app.models.preconfigured_mcp_config import PreconfiguredMCPConfig


class User(Base):
    """User model for authentication and user management."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    full_name: Mapped[str | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    mcp_configs: Mapped[list["MCPConfig"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    preconfigured_mcp_configs: Mapped[list["PreconfiguredMCPConfig"]] = relationship(back_populates="user", cascade="all, delete-orphan")

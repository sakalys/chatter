import uuid

from sqlalchemy import ForeignKey, types
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

import typing
if typing.TYPE_CHECKING:
    from app.models.user import User
    from app.models.mcp_tool import MCPTool

class MCPConfig(Base):
    """Model for storing user MCP configurations."""

    __tablename__ = "mcp_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(nullable=False)  # User-friendly name for the MCP configuration
    url: Mapped[str] = mapped_column(nullable=False)  # MCP URL
    configuration: Mapped[dict] = mapped_column(types.JSON, nullable=True)  # Additional configuration for the MCP

    # Relationships
    user: Mapped["User"] = relationship(back_populates="mcp_configs")
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    tools: Mapped[list["MCPTool"]] = relationship(back_populates="mcp_config", cascade="all,delete-orphan")

import uuid

from sqlalchemy import ForeignKey, types
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base
from typing import Any, Optional

import typing
if typing.TYPE_CHECKING:
    from app.models.mcp_config import MCPConfig


class MCPTool(Base):
    """Model for storing MCP tools."""

    __tablename__ = "mcp_tools"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    inputSchema: Mapped[dict[str, Any]] = mapped_column(types.JSON, nullable=False)

    # Relationships
    mcp_config: Mapped["MCPConfig"] = relationship(back_populates="tools")
    mcp_config_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mcp_configs.id", ondelete="CASCADE"), index=True, nullable=False)

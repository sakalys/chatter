import typing
import uuid
from typing import Any, Optional

from pydantic import BaseModel
from sqlalchemy import ForeignKey, UniqueConstraint, types
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if typing.TYPE_CHECKING:
    from app.models.mcp_config import MCPConfig


class MCPToolShape(BaseModel):
    name: str
    description: str | None
    inputSchema: dict[str, Any]


class MCPTool(Base):
    """Model for storing MCP tools."""

    __tablename__ = "mcp_tools"
    __table_args__ = (
        UniqueConstraint("code", name="uq_tool_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(types.String(62)) # max is 64, 2 is reserved for us
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    inputSchema: Mapped[dict[str, Any]] = mapped_column(types.JSON, nullable=False)

    # Relationships
    mcp_config: Mapped["MCPConfig"] = relationship(back_populates="tools")
    mcp_config_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("mcp_configs.id", ondelete="CASCADE"), index=True, nullable=False
    )

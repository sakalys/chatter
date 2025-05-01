import uuid

from sqlalchemy import ForeignKey, types
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

import typing
if typing.TYPE_CHECKING:
    from app.models.message import Message
    from app.models.mcp_tool import MCPTool

class MCPToolUse(Base):
    """Model for storing instances of MCP tool usage within messages."""

    __tablename__ = "mcp_tool_uses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    tool_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mcp_tools.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(nullable=False)
    args: Mapped[dict] = mapped_column(types.JSON, nullable=False)
    approved: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    message: Mapped["Message"] = relationship(back_populates="mcp_tool_use")
    tool: Mapped["MCPTool | None"] = relationship(uselist=False)

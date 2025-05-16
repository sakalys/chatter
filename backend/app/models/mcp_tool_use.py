import enum
import uuid

from sqlalchemy import ForeignKey, types, Enum
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.base import Base

import typing
if typing.TYPE_CHECKING:
    from app.models.message import Message
    from app.models.mcp_tool import MCPTool

class ToolUseState(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    Baba = "nana"

class MCPToolUse(Base):
    """Model for storing instances of MCP tool usage within messages."""

    __tablename__ = "mcp_tool_uses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(nullable=False)
    args: Mapped[dict] = mapped_column(types.JSON, nullable=False)
    state: Mapped[ToolUseState] = mapped_column(Enum(ToolUseState), nullable=False)

    # Relationships
    message: Mapped["Message"] = relationship(back_populates="mcp_tool_use")
    message_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    tool: Mapped["MCPTool | None"] = relationship(uselist=False)
    tool_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("mcp_tools.id", ondelete="SET NULL"), index=True, nullable=True)

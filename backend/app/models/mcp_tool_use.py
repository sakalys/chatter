import uuid

from sqlalchemy import Column, ForeignKey, String, Boolean, types
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.mcp_tool import MCPTool


class MCPToolUse(Base):
    """Model for storing instances of MCP tool usage within messages."""

    __tablename__ = "mcp_tool_uses"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    tool_id = Column(UUID(as_uuid=True), ForeignKey("mcp_tools.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    args = Column(types.JSON, nullable=False)
    approved = Column(Boolean, default=False, nullable=False)

    # Relationships
    message = relationship("Message", back_populates="mcp_tool_use")

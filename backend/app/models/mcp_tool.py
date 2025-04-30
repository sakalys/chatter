import uuid
from app.models.mcp_config import MCPConfig
from app.models.user import User
from sqlalchemy import Column, ForeignKey, String, types
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped

from app.db.base import Base
from typing import Any, Optional


class Tool(Base):
    """Model for storing MCP tools."""

    __tablename__ = "mcp_tools"

    id: Optional[UUID] = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    mcp_config_id: UUID = Column(UUID(as_uuid=True), ForeignKey("mcp_configs.id", ondelete="CASCADE"), nullable=False)
    name: str = Column(String, nullable=False)
    description: Optional[str] = Column(String, nullable=True)
    inputSchema: dict[str, Any] = Column(types.JSON, nullable=False)

    # Relationships
    mcp_config: Mapped[MCPConfig] = relationship(MCPConfig, back_populates="tools")


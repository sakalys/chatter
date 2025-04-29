import uuid
from sqlalchemy import Column, ForeignKey, String, types
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base
from typing import Any


class Tool(Base):
    """Model for storing MCP tools."""

    __tablename__ = "mcp_tools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    mcp_config_id = Column(UUID(as_uuid=True), ForeignKey("mcp_configs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    inputSchema = Column(types.JSON, nullable=False)


class MCPConfig(Base):
    """Model for storing user MCP configurations."""

    __tablename__ = "mcp_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)  # User-friendly name for the MCP configuration
    url = Column(String, nullable=False)  # MCP URL
    configuration = Column(types.JSON, nullable=True)  # Additional configuration for the MCP

    # Relationships
    user = relationship("User", back_populates="mcp_configs")
    tools = relationship("Tool", backref="mcp_config")

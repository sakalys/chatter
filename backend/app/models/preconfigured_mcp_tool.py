import typing
import uuid
from typing import Any, Optional

from sqlalchemy import ForeignKey, types
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if typing.TYPE_CHECKING:
    from app.models.preconfigured_mcp_config import PreconfiguredMCPConfig


class PreconfiguredMCPTool(Base):
    """Model for preconfigured MCP tools."""

    __tablename__ = "preconfigured_mcp_tools"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    inputSchema: Mapped[dict[str, Any]] = mapped_column(types.JSON, nullable=False)

    # Relationships
    preconfigured_mcp_config: Mapped["PreconfiguredMCPConfig"] = relationship(
        back_populates="tools"
    )
    preconfigured_mcp_config_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("preconfigured_mcp_configs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

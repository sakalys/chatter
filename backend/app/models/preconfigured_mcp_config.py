import typing
import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if typing.TYPE_CHECKING:
    from app.models.preconfigured_mcp_tool import PreconfiguredMCPTool
    from app.models.user import User


class PreconfiguredMCPConfig(Base):
    """Model for storing user preconfigured MCP configurations."""

    __tablename__ = "preconfigured_mcp_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enabled: Mapped[bool] = mapped_column(nullable=False)
    code: Mapped[str] = mapped_column(nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="preconfigured_mcp_configs")
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tools: Mapped[list["PreconfiguredMCPTool"]] = relationship(
        back_populates="preconfigured_mcp_config", cascade="all,delete-orphan", lazy="joined"
    )

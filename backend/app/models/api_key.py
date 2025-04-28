from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class ApiKey(Base):
    """Model for storing user API keys for different LLM providers."""
    
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String, nullable=False)  # e.g., "openai", "anthropic", etc.
    key_reference = Column(String, nullable=False)  # Reference to the encrypted key
    name = Column(String, nullable=True)  # User-friendly name for the key
    
    # Relationships
    user = relationship("User", back_populates="api_keys")

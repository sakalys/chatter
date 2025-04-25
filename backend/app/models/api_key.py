from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class ApiKey(Base):
    """Model for storing user API keys for different LLM providers."""
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=False)  # e.g., "openai", "anthropic", etc.
    key_reference = Column(String, nullable=False)  # Reference to the encrypted key in AWS KMS
    name = Column(String, nullable=True)  # User-friendly name for the key
    
    # Relationships
    user = relationship("User", back_populates="api_keys")

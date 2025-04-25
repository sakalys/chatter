from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ApiKeyBase(BaseModel):
    """Base API key schema."""
    provider: str
    name: Optional[str] = None


class ApiKeyCreate(ApiKeyBase):
    """API key creation schema."""
    key: str  # The actual API key to be encrypted


class ApiKeyUpdate(BaseModel):
    """API key update schema."""
    name: Optional[str] = None
    key: Optional[str] = None  # New API key to be encrypted


class ApiKeyResponse(ApiKeyBase):
    """API key response schema."""
    id: UUID
    user_id: UUID
    
    class Config:
        from_attributes = True

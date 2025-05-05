from uuid import UUID

from pydantic import BaseModel


class ApiKeyBase(BaseModel):
    """Base API key schema."""
    provider: str

class ApiKeyCreate(ApiKeyBase):
    """API key creation schema."""
    key: str  # The actual API key to be encrypted


class ApiKeyUpdate(BaseModel):
    """API key update schema."""
    name: str | None = None
    key: str | None = None  # New API key to be encrypted


class ApiKeyResponse(ApiKeyBase):
    """API key response schema."""
    id: UUID
    
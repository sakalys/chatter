
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"  # noqa: S105


class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: str | None = None
    exp: int | None = None


class Login(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str

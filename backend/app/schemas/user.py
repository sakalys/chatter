from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# Shared properties
class UserBase(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    is_active: bool | None = True


# Properties to receive via API on creation
class UserCreate(UserBase):
    id: Optional[str] = None
    email: EmailStr
    password: str | None = None # Make password optional for OAuth users

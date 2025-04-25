from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: Optional[bool] = False


# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None


# Properties to return via API
class UserResponse(UserBase):
    id: UUID
    email: EmailStr
    
    class Config:
        from_attributes = True


# Properties stored in DB
class UserInDB(UserBase):
    id: UUID
    hashed_password: str
    
    class Config:
        from_attributes = True

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


# Shared properties
class UserBase(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    is_active: bool | None = True
    is_superuser: bool | None = False


# Properties to receive via API on creation
# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str | None = None # Make password optional for OAuth users


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: str | None = None


# Properties to return via API
class UserResponse(UserBase):
    id: UUID
    email: EmailStr
    
    model_config = ConfigDict(from_attributes=True)


# Properties stored in DB
class UserInDB(UserBase):
    id: UUID
    hashed_password: str
    
    model_config = ConfigDict(from_attributes=True)

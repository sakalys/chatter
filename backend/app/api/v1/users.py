from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DB, get_current_user, get_current_active_superuser
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.services.user import update_user

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get current user.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_user_me(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Update current user.
    """
    user = await update_user(db, current_user, user_in)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def read_user_by_id(
    user_id: str,
    current_user: Annotated[User, Depends(get_current_active_superuser)],
    db: DB,
):
    """
    Get a specific user by id. Only for superusers.
    """
    from app.services.user import get_user_by_id
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user

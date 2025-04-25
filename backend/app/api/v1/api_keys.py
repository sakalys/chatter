from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import DB, get_current_user
from app.models.user import User
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse, ApiKeyUpdate
from app.services.api_key import (
    create_api_key, delete_api_key, get_api_key_by_id, get_api_keys_by_user, update_api_key
)

router = APIRouter()


@router.get("/", response_model=List[ApiKeyResponse])
async def read_api_keys(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get all API keys for the current user.
    """
    api_keys = await get_api_keys_by_user(db, current_user.id)
    return api_keys


@router.post("/", response_model=ApiKeyResponse)
async def create_user_api_key(
    api_key_in: ApiKeyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Create a new API key for the current user.
    """
    api_key = await create_api_key(db, api_key_in, current_user.id)
    return api_key


@router.get("/{api_key_id}", response_model=ApiKeyResponse)
async def read_api_key(
    api_key_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Get a specific API key by id.
    """
    api_key = await get_api_key_by_id(db, api_key_id, current_user.id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    return api_key


@router.put("/{api_key_id}", response_model=ApiKeyResponse)
async def update_user_api_key(
    api_key_id: UUID,
    api_key_in: ApiKeyUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Update a specific API key.
    """
    api_key = await get_api_key_by_id(db, api_key_id, current_user.id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    
    api_key = await update_api_key(db, api_key, api_key_in)
    return api_key


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_api_key(
    api_key_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DB,
):
    """
    Delete a specific API key.
    """
    api_key = await get_api_key_by_id(db, api_key_id, current_user.id)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    
    await delete_api_key(db, api_key)

import os
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import DB, get_current_user
from app.core.security import create_access_token
from app.schemas.auth import Token
from app.schemas.user import UserCreate
from app.services.user import create_user, get_user_by_email
from app.models.user import User

router = APIRouter()


class GoogleLoginRequest(BaseModel):
    token: str # Google ID token

@router.post("/google-login", response_model=Token)
async def google_login(
    request_data: GoogleLoginRequest,
    db: DB,
):
    """
    Authenticate user using Google ID token.
    """
    try:
        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(
            request_data.token, requests.Request(), settings.google_client_id
        )

        if not idinfo.get('email_verified'):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Must use a verified email",
            )

        # Extract user information
        user_email = idinfo['email']
        user_name = idinfo.get('name') # Name might not always be present

        # Check if user exists in the database
        user = await get_user_by_email(db, user_email)

        if not user:
            # If user does not exist, create a new user
            user_in = UserCreate(email=user_email, password=None, full_name=user_name) # Assuming password is not required for Google users
            user = await create_user(db, user_in)

        # Create access token for the user
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError as e:
        # Invalid token
        print(f"Google ID token verification failed: {e}") # Added detailed logging
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Handle other potential errors during verification or user creation
        print(f"Error during Google login: {e}")
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during Google login",
        )

@router.post("/test-login", response_model=Token)
async def test_login(
    db: DB,
):
    """
    Development endpoint to get an access token for a test user.
    """
    test_mode_enabled = os.getenv("ENV") == "development"

    if not test_mode_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test mode is not enabled",
        )

    test_user_email = "test@example.com"
    user = await get_user_by_email(db, test_user_email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Test user not found",
        )

    # Create access token for the test user
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout():
    """
    Logout the current user by invalidating the token (client-side).
    """
    return {"message": "Logout successful"}

@router.get("/validate")
async def validate_token(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Validate the current user's token.
    Returns 200 OK if the token is valid, 401 Unauthorized otherwise.
    """
    return {"valid": bool(current_user)}

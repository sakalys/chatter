from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.dependencies import DB
from app.core.security import create_access_token
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.user import authenticate_user, create_user, get_user_by_email

router = APIRouter()


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DB,
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
async def register_user(
    user_in: UserCreate,
    db: DB,
):
    """
    Register a new user.
    """
    # Check if user already exists
    user = await get_user_by_email(db, user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    user = await create_user(db, user_in)
    return user


from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel

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

    except ValueError:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Handle other potential errors during verification or user creation
        print(f"Error during Google login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during Google login",
        )

import pytest
from fastapi import status
from httpx import AsyncClient

from app.schemas.user import UserCreate
from app.services.user import create_user


@pytest.mark.asyncio
async def test_register_user(test_client: AsyncClient, test_db):
    """Test registering a new user."""
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword",
        "full_name": "New User",
    }
    
    response = await test_client.post("/api/v1/auth/register", json=user_data)
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["full_name"] == user_data["full_name"]
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_user_email_taken(test_client: AsyncClient, test_db):
    """Test registering a user with an email that's already taken."""
    # Create a user first
    user_in = UserCreate(
        email="existing@example.com",
        password="existingpassword",
        full_name="Existing User",
    )
    await create_user(test_db, user_in)
    
    # Try to register with the same email
    user_data = {
        "email": "existing@example.com",
        "password": "newpassword",
        "full_name": "New User",
    }
    
    response = await test_client.post("/api/v1/auth/register", json=user_data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "detail" in data
    assert "Email already registered" in data["detail"]


@pytest.mark.asyncio
async def test_login_user(test_client: AsyncClient, test_db):
    """Test logging in a user."""
    # Create a user first
    user_in = UserCreate(
        email="login@example.com",
        password="loginpassword",
        full_name="Login User",
    )
    await create_user(test_db, user_in)
    
    # Login with the user
    login_data = {
        "username": "login@example.com",  # OAuth2 uses username field
        "password": "loginpassword",
    }
    
    response = await test_client.post(
        "/api/v1/auth/login",
        data=login_data,  # Note: OAuth2 expects form data, not JSON
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_user_wrong_password(test_client: AsyncClient, test_db):
    """Test logging in a user with wrong password."""
    # Create a user first
    user_in = UserCreate(
        email="wrong@example.com",
        password="correctpassword",
        full_name="Wrong Password User",
    )
    await create_user(test_db, user_in)
    
    # Login with wrong password
    login_data = {
        "username": "wrong@example.com",
        "password": "wrongpassword",
    }
    
    response = await test_client.post(
        "/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "detail" in data
    assert "Incorrect email or password" in data["detail"]


@pytest.mark.asyncio
async def test_login_user_not_found(test_client: AsyncClient):
    """Test logging in a user that doesn't exist."""
    login_data = {
        "username": "nonexistent@example.com",
        "password": "password",
    }
    
    response = await test_client.post(
        "/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "detail" in data
    assert "Incorrect email or password" in data["detail"]

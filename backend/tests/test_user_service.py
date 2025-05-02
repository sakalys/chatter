import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserCreate
from app.services.user import create_user, get_user_by_email


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession):
    """Create a test user."""
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword",
        full_name="Test User",
    )
    user = await create_user(test_db, user_in)
    return user


@pytest.mark.asyncio
async def test_create_user(test_db: AsyncSession):
    """Test creating a user."""
    user_in = UserCreate(
        email="newuser@example.com",
        password="newpassword",
        full_name="New User",
    )
    user = await create_user(test_db, user_in)
    
    assert user.email == user_in.email
    assert user.full_name == user_in.full_name
    assert user.hashed_password != user_in.password  # Password should be hashed
    assert user.is_active is True


@pytest.mark.asyncio
async def test_get_user_by_email(test_db: AsyncSession, test_user):
    """Test getting a user by email."""
    user = await get_user_by_email(test_db, test_user.email)
    
    assert user is not None
    assert user.id == test_user.id
    assert user.email == test_user.email
    assert user.full_name == test_user.full_name


@pytest.mark.asyncio
async def test_get_user_by_email_not_found(test_db: AsyncSession):
    """Test getting a user by email that doesn't exist."""
    user = await get_user_by_email(test_db, "nonexistent@example.com")
    
    assert user is None

import secrets  # Import secrets module
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.mcp_tool import MCPToolShape
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.preconfigured_mcp_config import (
    create_preconfigured_config,
    get_preconfigured_config_by_code_and_user_id,
    get_preconfigured_configs_by_user,
)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """
    Get a user by email.

    Args:
        db: Database session
        email: User email

    Returns:
        User object or None if not found
    """
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    """
    Create a new user.

    Args:
        db: Database session
        user_in: User creation data

    Returns:
        Created user object
    """
    hashed_password = None
    if user_in.password is not None:
        hashed_password = get_password_hash(user_in.password)
    else:
        # Generate a random password for OAuth users
        random_password = secrets.token_urlsafe(16)  # Generate a random string
        hashed_password = get_password_hash(random_password)  # Hash the random string

    user = User(
        email=user_in.email,
        hashed_password=hashed_password,  # Use generated hashed password for OAuth users
        full_name=user_in.full_name,
        is_active=user_in.is_active,
    )
    if user_in.id:
        user.id = UUID(user_in.id)

    result = await create_preconfigured_config(
        db=db,
        user=user,
        enabled=True,
        code="fetch",
    )
    config_fetch = result.unwrap()
    db.add(config_fetch)

    result = await create_preconfigured_config(
        db=db,
        user=user,
        enabled=True,
        code="sequentialthinking",
    )
    config_seque = result.unwrap()
    db.add(config_seque)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user

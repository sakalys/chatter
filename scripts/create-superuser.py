#!/usr/bin/env python3
"""
Script to create a superuser for the chat platform.
Run this script inside the backend container:
docker-compose exec backend python scripts/create-superuser.py
"""

import asyncio
import sys
import uuid
from getpass import getpass

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

sys.path.append("/app")  # Add the app directory to the path

from app.core.config import settings
from app.models.user import User
from app.core.security import get_password_hash


async def create_superuser():
    # Create async engine
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
    )
    
    # Create async session factory
    async_session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    # Get user input
    email = input("Enter email: ")
    password = getpass("Enter password: ")
    full_name = input("Enter full name: ")
    
    # Create user
    async with async_session_factory() as session:
        # Check if user already exists
        result = await session.execute(sa.select(User).where(User.email == email))
        user = result.scalars().first()
        
        if user:
            print(f"User with email {email} already exists.")
            return
        
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            is_active=True,
            is_superuser=True,
        )
        
        session.add(user)
        await session.commit()
        
        print(f"Superuser {email} created successfully.")


if __name__ == "__main__":
    asyncio.run(create_superuser())

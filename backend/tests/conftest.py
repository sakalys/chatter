import asyncio
from collections.abc import AsyncGenerator, Generator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.api import api_router
from app.db.base import Base
from app.db.session import get_db

# Use PostgreSQL for testing
# The connection details are expected to be provided via environment variables
TEST_DATABASE_URL = "postgresql+asyncpg://test-user:test-password@db:5432/test-db"


@pytest.fixture
async def test_engine():
    """Create a test database engine and tables."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def test_db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_factory = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def test_app(test_db) -> FastAPI:
    """Create a test FastAPI app."""
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")

    # Override the get_db dependency
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    return app


@pytest.fixture
async def test_client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client for the FastAPI app."""
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        yield client
    await client.aclose()

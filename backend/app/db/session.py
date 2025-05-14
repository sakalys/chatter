from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=False, # Disable SQLAlchemy echoing
    future=True,
)

# Create async session factory
async_session_factory = async_sessionmaker(
    engine, 
    expire_on_commit=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """
    Dependency for getting async DB session.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()

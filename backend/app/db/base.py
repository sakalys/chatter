import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import as_declarative, DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncAttrs


@as_declarative()
class Base(AsyncAttrs):
    """Base class for all database models."""
    pass

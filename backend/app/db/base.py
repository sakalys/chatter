import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import as_declarative, declared_attr


@as_declarative()
class Base:
    """Base class for all database models."""

    # Common columns for all models
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Generate __tablename__ automatically based on class name
    @declared_attr
    def __tablename__(self) -> str:
        return self.__name__.lower()

"""add uuid default values

Revision ID: add_uuid_default
Revises: 545c5659fc3f
Create Date: 2025-04-26 14:33:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_uuid_default'
down_revision: Union[str, None] = '545c5659fc3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add UUID default values to id columns."""
    # Add default uuid_generate_v4() to users.id
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.alter_column('users', 'id',
                    server_default=sa.text('uuid_generate_v4()'),
                    existing_type=postgresql.UUID())
    
    # Add default uuid_generate_v4() to api_keys.id
    op.alter_column('api_keys', 'id',
                    server_default=sa.text('uuid_generate_v4()'),
                    existing_type=postgresql.UUID())
    
    # Add default uuid_generate_v4() to conversations.id
    op.alter_column('conversations', 'id',
                    server_default=sa.text('uuid_generate_v4()'),
                    existing_type=postgresql.UUID())
    
    # Add default uuid_generate_v4() to mcp_configs.id
    op.alter_column('mcp_configs', 'id',
                    server_default=sa.text('uuid_generate_v4()'),
                    existing_type=postgresql.UUID())
    
    # Add default uuid_generate_v4() to messages.id
    op.alter_column('messages', 'id',
                    server_default=sa.text('uuid_generate_v4()'),
                    existing_type=postgresql.UUID())


def downgrade() -> None:
    """Remove UUID default values from id columns."""
    # Remove default from users.id
    op.alter_column('users', 'id',
                    server_default=None,
                    existing_type=postgresql.UUID())
    
    # Remove default from api_keys.id
    op.alter_column('api_keys', 'id',
                    server_default=None,
                    existing_type=postgresql.UUID())
    
    # Remove default from conversations.id
    op.alter_column('conversations', 'id',
                    server_default=None,
                    existing_type=postgresql.UUID())
    
    # Remove default from mcp_configs.id
    op.alter_column('mcp_configs', 'id',
                    server_default=None,
                    existing_type=postgresql.UUID())
    
    # Remove default from messages.id
    op.alter_column('messages', 'id',
                    server_default=None,
                    existing_type=postgresql.UUID()) 
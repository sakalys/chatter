#!/bin/bash
set -e

# Check if a migration message was provided
if [ -z "$1" ]; then
    echo "Error: Migration message is required."
    echo "Usage: $0 <migration_message>"
    exit 1
fi

# Ensure the backend container is running
echo "Ensuring backend container is ready..."
docker compose up -d backend

# Generate a new migration
echo "Generating new migration: $1"
docker compose exec backend uv run alembic revision --autogenerate -m "$1"

echo "Migration generated successfully!"
echo "You can now apply the migration with: ./scripts/init-db.sh"

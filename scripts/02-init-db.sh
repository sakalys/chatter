#!/bin/bash
set -e

# Ensure the database container is running
echo "Ensuring database container is ready..."
docker compose up -d db

# Wait for the database to be ready
echo "Waiting for database to be ready..."
docker compose exec db sh -c 'until pg_isready; do sleep 1; done'

docker compose up -d backend

# Run migrations
echo "Running database migrations..."
docker compose exec backend uv run alembic upgrade head

docker compose exec backend uv run python -m fixtures.create_fixtures

echo "Database initialization complete!"

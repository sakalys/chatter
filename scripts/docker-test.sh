#!/bin/bash
set -e

# Load environment variables from .env file
set -a
[ -f .env ] && . .env
set +a

# Set default database host and port if not already set
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}

# Wait for the database service to be healthy
docker compose exec db pg_isready -U chatuser -d chatdb -h db -p 5432 -t 0

# Check if user exists
if ! docker compose exec db psql -U chatuser -d chatdb -tAc "SELECT 1 FROM pg_roles WHERE rolname='test-user'" | grep -q 1; then
  # Create user if it does not exist
  docker compose exec db psql -U chatuser -d chatdb -c "CREATE USER \"test-user\" WITH PASSWORD 'test-password';"
fi

# Create database if it does not exist
if ! docker compose exec db psql -U chatuser -d chatdb -tAc "SELECT 1 FROM pg_database WHERE datname='test-db'" | grep -q 1; then
  docker compose exec db psql -U chatuser -d chatdb -c "CREATE DATABASE \"test-db\" OWNER \"test-user\";"
fi

# Run linting with ruff
echo "Running linting with ruff..."
# docker compose run --rm backend uv run ruff check .

cd backend
# uv run ruff check .

# Apply Alembic migrations and run tests with pytest
# echo "Applying Alembic migrations and running tests..."
# docker compose run --rm \
#     -e POSTGRES_USER=chatuser \
#     -e POSTGRES_PASSWORD=chatpassword \
#     -e POSTGRES_DB=chatdb \
#     -e DB_HOST=${DB_HOST} \
#     -e DB_PORT=${DB_PORT} \
#     backend bash -c "uv run alembic upgrade head && uv run pytest -xvs tests"
  
bash -c "uv run alembic upgrade head && uv run pytest -xvs tests"

echo "All tests and linting passed!"

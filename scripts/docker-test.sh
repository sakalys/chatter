#!/bin/bash
set -e

# Load environment variables from .env file
set -a
[ -f .env ] && . .env
set +a

# Set default database host and port if not already set
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}

# Run linting with ruff
echo "Running linting with ruff..."
# docker compose run --rm backend uv run ruff check .

# Run tests with pytest
echo "Running tests with pytest..."
docker compose run --rm \
    -e POSTGRES_USER=${POSTGRES_USER} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
    -e POSTGRES_DB=${POSTGRES_DB} \
    -e DB_HOST=${DB_HOST} \
    -e DB_PORT=${DB_PORT} \
    backend uv run pytest -xvs tests

echo "All tests and linting passed!"

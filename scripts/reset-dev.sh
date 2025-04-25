#!/bin/bash
set -e

# Stop the development environment
echo "Stopping development environment..."
docker compose down

# Remove volumes to reset the database
echo "Removing volumes..."
docker compose down -v

# Start the development environment
echo "Starting development environment..."
./scripts/start-dev.sh

echo "Development environment has been reset!"

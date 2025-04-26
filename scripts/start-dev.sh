#!/bin/bash
set -e

# Start the development environment
echo "Starting development environment..."
docker compose up -d

# Initialize the database
echo "Initializing database..."
./scripts/init-db.sh

# Copy scripts to the backend container
echo "Copying scripts to backend container..."
./scripts/copy-scripts.sh

echo "Development environment is ready!"
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"

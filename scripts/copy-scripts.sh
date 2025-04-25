#!/bin/bash
set -e

# Ensure the backend container is running
echo "Ensuring backend container is ready..."
docker compose up -d backend

# Create the scripts directory in the backend container
echo "Creating scripts directory in backend container..."
docker compose exec backend mkdir -p /app/scripts

# Copy the create-superuser.py script to the backend container
echo "Copying scripts to backend container..."
docker cp scripts/create-superuser.py $(docker compose ps -q backend):/app/scripts/

echo "Scripts copied successfully!"

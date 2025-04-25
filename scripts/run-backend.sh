#!/bin/bash
set -e

# Change to the backend directory
cd "$(dirname "$0")/../backend"

# Run the backend server
echo "Starting backend server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

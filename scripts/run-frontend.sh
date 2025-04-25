#!/bin/bash
set -e

# Change to the frontend directory
cd "$(dirname "$0")/../frontend"

# Run the frontend server
echo "Starting frontend server..."
npm run dev

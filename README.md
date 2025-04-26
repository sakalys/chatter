# Chat Platform

[![CI](https://github.com/yourusername/chat-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/chat-platform/actions/workflows/ci.yml)

A production-grade, model-agnostic chat platform similar to ChatGPT or Claude. Users can select their preferred models and use their own API keys. The platform also supports MCP (Model Context Protocol) calls via user-specified URLs.

## Features

- **Model Agnostic**: Use any supported LLM provider (OpenAI, Anthropic, etc.)
- **API Key Management**: Securely store and manage your API keys
- **Conversation Management**: Create, view, and manage chat conversations
- **MCP Integration**: Connect to MCP servers for extended capabilities
  Users can customize their accounts by configuring these client-server connections.
- **User Authentication**: Secure user accounts and authentication

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Vite
- **Database**: PostgreSQL
- **API Key Storage**: AWS KMS
- **Styling**: Tailwind CSS
- **Development**: Docker Compose

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chat-platform.git
   cd chat-platform
   ```

2. Start the development environment (this will start all services, initialize the database, and copy scripts):
   ```bash
   ./scripts/start-dev.sh
   ```

   Or you can do it step by step:
   ```bash
   docker compose up -d
   ./scripts/init-db.sh
   ./scripts/copy-scripts.sh
   ```

3. Create a superuser (optional):
   ```bash
   docker compose exec backend python scripts/create-superuser.py
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Testing without Google Login

For development and testing purposes, you can bypass the Google login process. This is useful for quickly accessing the main application interface without needing to go through the OAuth flow.

To enable the login bypass:

1.  Ensure the backend service is running with the `TEST_MODE_ENABLED` environment variable set to `true`. If you are using `docker-compose.yml`, this is already configured in the `backend` service. If running the backend locally, you need to set this environment variable before starting the backend server.

2.  Run the frontend development server with the `VITE_BYPASS_AUTH` environment variable set to `true`:
    ```bash
    cd frontend && VITE_BYPASS_AUTH=true npm run dev
    ```

When the frontend starts with `VITE_BYPASS_AUTH=true`, it will attempt to obtain a test authentication token from the backend's `/api/v1/auth/test-login` endpoint. If the backend is running with `TEST_MODE_ENABLED=true`, it will provide a token for a test user, allowing you to access the main application.

Note that the test user may not have any LLM configurations or API keys set up by default. You may need to manually add these through the application's settings or directly in the database for full functionality.

### Managing the Development Environment

To stop the development environment:
```bash
./scripts/stop-dev.sh
```

To reset the development environment (this will remove all data and start fresh):
```bash
./scripts/reset-dev.sh
```

### Database Migrations

To generate a new migration (when you've made changes to the database models):
```bash
./scripts/generate-migration.sh "description of the changes"
```

To apply migrations:
```bash
./scripts/init-db.sh
```

### Local Development

You can also run the servers locally without Docker for development:

#### Backend

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
cd backend
uv sync -e ".[dev,test]"

# Run the backend server
../scripts/run-backend.sh
```

#### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Run the frontend server
../scripts/run-frontend.sh
```

### Testing and Linting

Run tests and linting inside Docker:
```bash
./scripts/docker-test.sh
```

Or run them locally (requires Python 3.11+):
```bash
./scripts/test.sh
```

The tests use an in-memory SQLite database for testing, so no additional setup is required.

## API Documentation

The API documentation is available at http://localhost:8000/docs when the development server is running.

## Project Structure

```
chat-platform/
├── backend/                # FastAPI backend
│   ├── alembic/            # Database migrations
│   ├── app/                # Application code
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core functionality
│   │   ├── db/             # Database setup
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   └── Dockerfile          # Backend Dockerfile
├── frontend/               # React frontend
│   ├── src/                # Source code
│   └── Dockerfile          # Frontend Dockerfile
├── docker-compose.yml      # Docker Compose configuration
└── README.md               # Project documentation
```

## License

MIT

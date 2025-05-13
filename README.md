# Chat Platform

A production-grade, model-agnostic chat platform similar to ChatGPT or Claude. Users can select their preferred LLM provider and models and use their own API keys. The platform also supports MCP (Model Context Protocol) calls via user-specified URLs.

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
- **Styling**: Tailwind CSS
- **Development**: Docker Compose

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/sakalys/chat-platform.git
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

3. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

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

## Thoughts

MCP Servers:
- Types by state management: __stateful__ or __stateless__
  - If they are stateful, then they need to store their memory somewhere. E.g. 
  github MCP server allows the users access to github on behalf of the user, but the
  data that it has access to can change over time (i.e. gets stored on github
  servers)
  - If they are stateful they might also store their state in memory.

## License


BSD 3-Clause License


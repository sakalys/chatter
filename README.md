# Chat Platform

A production-grade, model-agnostic chat platform similar to ChatGPT or Claude. Users can select their preferred models and use their own API keys. The platform also supports MCP (Model Context Protocol) calls via user-specified URLs.

## Features

- **Model Agnostic**: Use any supported LLM provider (OpenAI, Anthropic, etc.)
- **API Key Management**: Securely store and manage your API keys
- **Conversation Management**: Create, view, and manage chat conversations
- **MCP Integration**: Connect to MCP servers for extended capabilities
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

2. Start the development environment:
   ```bash
   docker-compose up -d
   ```

3. Run database migrations:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

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

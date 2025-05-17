# MooPoint Chat Platform

A production-grade, model-agnostic chat platform similar to ChatGPT or Claude. Users can select their preferred LLM provider and models and use their own API keys. The platform also supports MCP (Model Context Protocol) calls via user-specified URLs.

![MooPoint logo](https://raw.githubusercontent.com/sakalys/chatter/refs/heads/main/frontend/public/favicon.png)

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
docker compose up -d
./backend/scripts/02-init-db.sh
```

3. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

### Testing and Linting

Run backend tests and linting inside Docker:
```bash
.backend/scripts/docker-test.sh
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


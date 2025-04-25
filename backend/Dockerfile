FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy project configuration
COPY pyproject.toml .

# Install Python dependencies
RUN uv sync --extra dev --extra test

# Copy application code
COPY . .

# Run the application
CMD ["uv", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000", "--reload"]

from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv

load_dotenv()

secret_key = os.getenv("SECRET_KEY")
if secret_key is None:
    raise ValueError("SECRET_KEY environment variable not set")

database_url = os.getenv("DATABASE_URL")
if database_url is None:
    raise ValueError("DATABASE_URL environment variable not set")

secret_key_tokens = os.getenv("SECRET_KEY_TOKENS")
if secret_key_tokens is None:
    raise ValueError("SECRET_KEY_TOKENS environment variable not set")

class Settings(BaseModel):
    """Application settings."""

    # API settings
    api_title: str = "Moo Point API"
    api_description: str = "API for a model-agnostic chat platform with tool use using MCP"
    api_version: str = "0.1.0"
    
    # Environment
    env: str = Field(default=os.getenv("ENV", "production"))
    debug: bool = Field(default=os.getenv("DEBUG", "false").lower() == "true")
    test_mode_enabled: bool = Field(default=False)

    # Security
    secret_key: str = Field(default=secret_key)

    secret_key_tokens: str = Field(default=secret_key_tokens)
    access_token_expire_minutes: int = Field(default=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30000")))
    
    # Database
    database_url: str = Field(default=database_url)

    # CORS
    cors_origins: list[str] = Field(default=[os.getenv("CORS_ORIGINS", "http://localhost:5173")])

    google_client_id: str = Field(default=os.getenv("GOOGLE_CLIENT_ID", "181853076785-uf93784hrobvqqfrgftek08hd5n03m25.apps.googleusercontent.com"))

# Create settings instance
settings = Settings()

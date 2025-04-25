from typing import List, Optional
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application settings."""
    
    # API settings
    api_title: str = "Chat Platform API"
    api_description: str = "API for a model-agnostic chat platform"
    api_version: str = "0.1.0"
    
    # Environment
    env: str = Field(default="development")
    debug: bool = Field(default=True)
    
    # Security
    secret_key: str = Field(default="changethisinsecretkeytosomethingsecure")
    access_token_expire_minutes: int = Field(default=30)
    
    # Database
    database_url: str = Field(default="postgresql://chatuser:chatpassword@db:5432/chatdb")
    
    # Redis
    redis_url: str = Field(default="redis://redis:6379/0")
    
    # AWS
    aws_region: str = Field(default="us-east-1")
    aws_endpoint_url: Optional[str] = Field(default=None)  # For LocalStack
    
    # CORS
    cors_origins: List[str] = Field(default=["http://localhost:3000"])


# Create settings instance
settings = Settings()

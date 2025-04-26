from pydantic import BaseModel, Field, validator
from pydantic import ConfigDict


class Settings(BaseModel):
    """Application settings."""

    model_config = ConfigDict(env_file=None, extra='ignore')
    
    # API settings
    api_title: str = "Chat Platform API"
    api_description: str = "API for a model-agnostic chat platform"
    api_version: str = "0.1.0"
    
    # Environment
    env: str = Field(default="development")
    debug: bool = Field(default=True)
    test_mode_enabled: bool = Field(default=False)

    @validator('test_mode_enabled', pre=True)
    def parse_boolean(cls, v):
        if isinstance(v, str):
            return v.lower() == 'true'
        return v
    
    # Security
    secret_key: str = Field(default="changethisinsecretkeytosomethingsecure")
    access_token_expire_minutes: int = Field(default=30)
    
    # Database
    database_url: str = Field(default="postgresql://chatuser:chatpassword@db:5432/chatdb")
    
    # Redis
    redis_url: str = Field(default="redis://redis:6379/0")
    
    # AWS
    aws_region: str = Field(default="us-east-1")
    aws_endpoint_url: str | None = Field(default=None)  # For LocalStack
    
    # CORS
    cors_origins: list[str] = Field(default=["http://localhost:5173"])
    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")

    google_client_id: str = Field(default="181853076785-uf93784hrobvqqfrgftek08hd5n03m25.apps.googleusercontent.com")


# Create settings instance
settings = Settings()

print(f"Settings initialized - test_mode_enabled: {settings.test_mode_enabled}")

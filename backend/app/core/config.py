from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    """Application settings."""

    # API settings
    api_title: str = "Moo Point API"
    api_description: str = "API for a model-agnostic chat platform with tool use using MCP"
    api_version: str = "0.1.0"
    
    # Environment
    env: str = Field(default="development")
    debug: bool = Field(default=True)
    test_mode_enabled: bool = Field(default=False)

    # Security
    secret_key: str = Field(default="changethisinsecretkeytosomethingsecure")
    access_token_expire_minutes: int = Field(default=30)
    
    # Database
    database_url: str = Field(default=os.getenv("DATABASE_URL", ""))
    
    # Redis
    redis_url: str = Field(default="redis://redis:6379/0")
    
    # AWS
    aws_region: str = Field(default="us-east-1")
    aws_endpoint_url: str | None = Field(default=None)  # For LocalStack
    aws_kms_key_id: str | None = Field(default=None)  # KMS key ID or alias, must be set in production
    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")

    # CORS
    cors_origins: list[str] = Field(default=["http://localhost:5173"])

    google_client_id: str = Field(default="181853076785-uf93784hrobvqqfrgftek08hd5n03m25.apps.googleusercontent.com")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Override with environment variables if they exist
        self.aws_region = os.getenv("AWS_REGION", self.aws_region)
        self.aws_endpoint_url = os.getenv("AWS_ENDPOINT_URL", self.aws_endpoint_url)
        self.aws_kms_key_id = 'alias/chat-api-keys'
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID", self.aws_access_key_id)
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY", self.aws_secret_access_key)


# Create settings instance
settings = Settings()

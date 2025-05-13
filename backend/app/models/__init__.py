from app.models.api_key import ApiKey
from app.models.conversation import Conversation
from app.models.mcp_config import MCPConfig
from app.models.mcp_tool import MCPTool
from app.models.mcp_tool_use import MCPToolUse
from app.models.message import Message
from app.models.preconfigured_mcp_config import PreconfiguredMCPConfig
from app.models.preconfigured_mcp_tool import PreconfiguredMCPTool
from app.models.user import User

# For Alembic to detect all models
__all__ = [
    "User",
    "ApiKey",
    "Conversation",
    "Message",
    "MCPConfig",
    "MCPToolUse",
    "MCPTool",
    "PreconfiguredMCPConfig",
    "PreconfiguredMCPTool",
]

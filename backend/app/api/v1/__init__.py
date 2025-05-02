from fastapi import APIRouter

from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.mcp_configs import router as mcp_configs_router

# Create API router
api_router = APIRouter()

# Include all routers
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(api_keys_router, prefix="/api-keys", tags=["api-keys"])
api_router.include_router(conversations_router, prefix="/conversations", tags=["conversations"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(mcp_configs_router, prefix="/mcp-configs", tags=["mcp-configs"])

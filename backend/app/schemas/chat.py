from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class ChatCompletionRequest(BaseModel):
    message: str
    model: str
    api_key_id: str
    conversation_id: Optional[UUID] = None
    stream: bool = False

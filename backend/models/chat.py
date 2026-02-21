from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ChatMessage(BaseModel):
    id: Optional[str] = None
    sender_id: str
    receiver_id: str
    text: str
    timestamp: datetime = datetime.utcnow()
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PlayerStats(BaseModel):
    user_id: str
    username: str
    wpm: int
    accuracy: int

class GameRecord(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    room_id: str
    mode: str # "bot" or "private"
    players: List[PlayerStats]
    winner_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
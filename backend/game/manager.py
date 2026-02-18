import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Dictionary structure: { room_id: { user_id: WebSocket } }
        self.active_rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = {}
        self.active_rooms[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_rooms:
            # Safely remove the user from the room
            self.active_rooms[room_id].pop(user_id, None)
            # If the room is empty, delete the room key to save memory
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict):
        """Sends a message to everyone currently in the specific room."""
        if room_id in self.active_rooms:
            for connection in self.active_rooms[room_id].values():
                await connection.send_text(json.dumps(message))

# Create a single instance to be used across the app
manager = ConnectionManager()
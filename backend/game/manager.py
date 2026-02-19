# import json
# from fastapi import WebSocket
# from backend.game.paragraphs import get_random_paragraph
# from typing import Dict, List, Set

# class ConnectionManager:
#     def __init__(self):
#         # Dictionary structure: { room_id: { user_id: WebSocket } }
#         self.active_rooms: dict[str, dict[str, WebSocket]] = {}
#         # room_id -> set of user_ids who are ready
#         self.ready_players: Dict[str, Set[str]] = {}

#     async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
#         await websocket.accept()
#         if room_id not in self.active_rooms:
#             self.active_rooms[room_id] = {}
#             self.ready_players[room_id] = set()
#         self.active_rooms[room_id][user_id] = websocket

#     def disconnect(self, room_id: str, user_id: str):
#         if room_id in self.active_rooms:
#             # Safely remove the user from the room
#             self.active_rooms[room_id].pop(user_id, None)
#             if user_id in self.ready_players.get(room_id, set()):
#                 self.ready_players[room_id].remove(user_id)
#             # If the room is empty, delete the room key to save memory
#             if not self.active_rooms[room_id]:
#                 del self.active_rooms[room_id]

#     async def set_ready(self, room_id: str, user_id: str):
#         if room_id in self.ready_players:
#             self.ready_players[room_id].add(user_id)
            
#             # Check if both players are ready
#             num_connected = len(self.active_rooms.get(room_id, {}))
#             num_ready = len(self.ready_players[room_id])
            
#             # If 2 players are connected and both are ready (or 1 if it's a Bot game)
#             if num_ready >= 2 or (num_ready >= 1 and "bot" in room_id): # Simple bot logic check
#                 paragraph = get_random_paragraph()
#                 await self.broadcast_to_room(room_id, {
#                     "type": "START_GAME",
#                     "paragraph": paragraph
#                 })
#             else:
#                 # Notify the other player that someone is ready
#                 await self.broadcast_to_room(room_id, {
#                     "type": "PLAYER_READY",
#                     "user_id": user_id
#                 })

#     async def broadcast_to_room(self, room_id: str, message: dict):
#         """Sends a message to everyone currently in the specific room."""
#         if room_id in self.active_rooms:
#             for connection in self.active_rooms[room_id].values():
#                 await connection.send_text(json.dumps(message))

# # Create a single instance to be used across the app
# manager = ConnectionManager()

import json
import asyncio
from fastapi import WebSocket
from backend.game.paragraphs import get_random_paragraph
from backend.game.engine import spawn_bot
from typing import Dict, List, Set

class ConnectionManager:
    def __init__(self):
        self.active_rooms: dict[str, dict[str, WebSocket]] = {}
        self.ready_players: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = {}
            self.ready_players[room_id] = set()
        self.active_rooms[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_rooms:
            self.active_rooms[room_id].pop(user_id, None)
            if user_id in self.ready_players.get(room_id, set()):
                self.ready_players[room_id].remove(user_id)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]
                if room_id in self.ready_players:
                    del self.ready_players[room_id]

    async def set_ready(self, room_id: str, user_id: str):
        if room_id in self.ready_players:
            self.ready_players[room_id].add(user_id)
            
            num_ready = len(self.ready_players[room_id])
            is_bot_game = "bot" in room_id

            # Game starts if 2 humans are ready OR 1 human is ready in a bot room
            if num_ready >= 2 or (num_ready >= 1 and is_bot_game):
                paragraph = get_random_paragraph()
                
                # 1. Start game for the human(s)
                await self.broadcast_to_room(room_id, {
                    "type": "START_GAME",
                    "paragraph": paragraph
                })

                # 2. If it's a bot game, fire off the background typing task
                if is_bot_game:
                    # TODO: Later, fetch user's best WPM from DB and set target_wpm accordingly
                    target_wpm = 60 
                    asyncio.create_task(spawn_bot(self, room_id, target_wpm, paragraph))
            else:
                await self.broadcast_to_room(room_id, {
                    "type": "PLAYER_READY",
                    "user_id": user_id
                })

    async def broadcast_to_room(self, room_id: str, message: dict):
        if room_id in self.active_rooms:
            for connection in self.active_rooms[room_id].values():
                await connection.send_text(json.dumps(message))

manager = ConnectionManager()
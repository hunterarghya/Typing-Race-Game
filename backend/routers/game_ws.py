# import json
# from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# from backend.game.manager import manager

# router = APIRouter()

# @router.websocket("/ws/game/{room_id}/{user_id}")
# async def game_websocket(websocket: WebSocket, room_id: str, user_id: str):
#     # 1. Register the connection
#     await manager.connect(websocket, room_id, user_id)
    
#     try:
#         while True:
#             # 2. Wait for messages from this specific player
#             data = await websocket.receive_text()
#             message = json.loads(data)
            
#             # 3. Handle progress updates
#             if message.get("type") == "progress":
#                 # Tell everyone in the room (including the sender) where this player is
#                 await manager.broadcast_to_room(room_id, {
#                     "type": "opponent_progress",
#                     "user_id": user_id,
#                     "charIndex": message["charIndex"]
#                 })
                
#     except WebSocketDisconnect:
#         # 4. Clean up on leave
#         manager.disconnect(room_id, user_id)

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import jwt, JWTError
from backend.game.manager import manager
from backend.core.config import settings

router = APIRouter()

@router.websocket("/ws/game/{room_id}/{token}")
async def game_websocket(websocket: WebSocket, room_id: str, token: str):
    # 1. Manually decode and verify the token
    try:
        # Using the same secret and algorithm as deps.py
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        # If token is invalid or expired
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Register the connection using the verified user_id
    await manager.connect(websocket, room_id, user_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "progress":
                await manager.broadcast_to_room(room_id, {
                    "type": "opponent_progress",
                    "user_id": user_id,
                    "charIndex": message["charIndex"]
                })
                
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
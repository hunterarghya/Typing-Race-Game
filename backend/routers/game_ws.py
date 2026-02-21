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
    # check if the connection was successful (room not full)
    success = await manager.connect(websocket, room_id, user_id)

    if not success:
        return # Stop the function here; manager already closed the socket
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "ready":
                await manager.set_ready(room_id, user_id)

            if message.get("type") == "rematch":
                await manager.handle_rematch(room_id, user_id)
            
            
            if message.get("type") == "progress":
                # 1. Update the Manager (for winner/timer logic)
                

                await manager.update_progress(
                    room_id, 
                    user_id, 
                    message["charIndex"], 
                    message.get("wpm", 0), 
                    message.get("accuracy", 100)
                )
                
                # 2. Broadcast progress to the opponent (for UI bars)
                await manager.broadcast_to_room(room_id, {
                    "type": "opponent_progress",
                    "user_id": user_id,
                    "charIndex": message["charIndex"],
                    "wpm": message.get("wpm", "0"),
                    "accuracy": message.get("accuracy", "100")
                })
                
    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
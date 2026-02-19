# import uuid
# import json
# from fastapi import APIRouter, Depends, HTTPException
# from backend.auth.deps import get_current_user
# from backend.core.redis_client import redis_client

# router = APIRouter(prefix="/game", tags=["Game Operations"])

# @router.post("/create/{mode}")
# async def create_game(mode: str, current_user: dict = Depends(get_current_user)):
#     """
#     Called when a user clicks 'Play with Bot' or 'Create Invite Link'.
#     Creates a temporary room in Redis.
#     """
#     if mode not in ["private", "bot"]:
#         raise HTTPException(status_code=400, detail="Invalid game mode")

#     # Generate a unique room ID
#     room_id = str(uuid.uuid4())[:8] 
    
#     # Store game metadata in Redis (expires in 1 hour)
#     room_data = {
#         "room_id": room_id,
#         "creator_id": str(current_user["_id"]),
#         "creator_username": current_user["username"],
#         "mode": mode,
#         "status": "waiting"
#     }
    
#     # Save to Redis: Key is "room:abcd123"
#     await redis_client.setex(
#         f"room:{room_id}", 
#         3600, 
#         json.dumps(room_data)
#     )
    
#     # Return the info to the frontend
#     return {
#         "room_id": room_id, 
#         "mode": mode,
#         "redirect_url": f"/arena.html?room={room_id}&mode={mode}"
#     }

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from backend.auth.deps import get_current_user
from backend.core.redis_client import redis_client

router = APIRouter(prefix="/game", tags=["Game Operations"])

@router.post("/create/{mode}")
async def create_game(mode: str, current_user: dict = Depends(get_current_user)):
    """
    Called when a user clicks 'Play with Bot' or 'Create Invite Link'.
    Creates a temporary room in Redis.
    """
    if mode not in ["private", "bot"]:
        raise HTTPException(status_code=400, detail="Invalid game mode")

    # Generate a unique room ID
    room_id = f"bot-{str(uuid.uuid4())[:8]}" if mode == "bot" else str(uuid.uuid4())[:8]
    
    # Store game metadata in Redis (expires in 1 hour)
    room_data = {
        "room_id": room_id,
        "creator_id": str(current_user["_id"]),
        "creator_username": current_user["username"],
        "mode": mode,
        "status": "waiting"
    }
    
    # Save to Redis: Key is "room:abcd123"
    await redis_client.setex(
        f"room:{room_id}", 
        3600, 
        json.dumps(room_data)
    )
    
    # Return the info to the frontend
    return {
        "room_id": room_id, 
        "mode": mode,
        "redirect_url": f"arena.html?room={room_id}&mode={mode}"
    }
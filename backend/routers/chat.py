from fastapi import APIRouter, Depends, HTTPException
from backend.auth.deps import get_current_user
from backend.core.db import messages_col, users_col
from backend.models.chat import ChatMessage
from bson import ObjectId
from datetime import datetime
import math

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/send")
async def send_message(receiver_username: str, text: str, current_user: dict = Depends(get_current_user)):
    receiver = await users_col.find_one({"username": receiver_username})
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    msg_obj = {
        "sender_id": current_user["_id"],
        "receiver_id": str(receiver["_id"]),
        "text": text,
        "timestamp": datetime.utcnow()
    }
    await messages_col.insert_one(msg_obj)
    return {"status": "sent"}

@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    # We count messages where I am the receiver and 'read' is False
    count = await messages_col.count_documents({
        "receiver_id": current_user["_id"],
        "read": {"$ne": True} # Matches if 'read' is False or doesn't exist
    })
    return {"unread_count": count}

@router.post("/mark-read/{username}")
async def mark_read(username: str, current_user: dict = Depends(get_current_user)):
    other_user = await users_col.find_one({"username": username})
    if other_user:
        await messages_col.update_many(
            {
                "sender_id": str(other_user["_id"]), 
                "receiver_id": current_user["_id"], 
                "read": {"$ne": True}
            },
            {"$set": {"read": True}}
        )
    return {"status": "ok"}

@router.get("/inbox")
async def get_inbox(current_user: dict = Depends(get_current_user)):
    uid = current_user["_id"]
    # Aggregation to find latest message per unique conversation partner
    pipeline = [
        {"$match": {"$or": [{"sender_id": uid}, {"receiver_id": uid}]}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$sender_id", uid]}, 
                    "$receiver_id", 
                    "$sender_id"
                ]
            },
            "last_msg": {"$first": "$text"},
            "time": {"$first": "$timestamp"}
        }},
        {"$sort": {"time": -1}}
    ]
    
    results = await messages_col.aggregate(pipeline).to_list(length=50)
    
    inbox = []
    for res in results:
        user = await users_col.find_one({"_id": ObjectId(res["_id"])})
        if user:
            inbox.append({
                "username": user["username"],
                "last_msg": res["last_msg"],
                "time": res["time"].strftime("%H:%M")
            })
    return inbox

@router.get("/history/{username}")
async def get_chat_history(username: str, current_user: dict = Depends(get_current_user)):
    other_user = await users_col.find_one({"username": username})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    uid = current_user["_id"]
    oid = str(other_user["_id"])
    
    query = {
        "$or": [
            {"sender_id": uid, "receiver_id": oid},
            {"sender_id": oid, "receiver_id": uid}
        ]
    }
    
    cursor = messages_col.find(query).sort("timestamp", 1)
    messages = await cursor.to_list(length=100)
    
    formatted = []
    for m in messages:
        formatted.append({
            "is_me": m["sender_id"] == uid,
            "text": m["text"],
            "time": m["timestamp"].strftime("%H:%M")
        })
    return formatted
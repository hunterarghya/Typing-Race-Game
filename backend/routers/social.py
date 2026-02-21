# from fastapi import APIRouter, Depends, Query
# from backend.auth.deps import get_current_user
# from backend.core.db import users_col
# import math

# router = APIRouter(prefix="/social", tags=["Social"])

# @router.get("/search")
# async def search_players(
#     username: str = Query(None),
#     min_wpm: int = Query(0),
#     max_wpm: int = Query(250),
#     page: int = Query(1),
#     limit: int = Query(10),
#     current_user: dict = Depends(get_current_user)
# ):
#     skip = (page - 1) * limit
    
#     # Build Query
#     query = {
#         "highest_speed": {"$gte": min_wpm, "$lte": max_wpm}
#     }
    
#     # If a username is provided, use regex for partial matching (case-insensitive)
#     if username:
#         query["username"] = {"$regex": username, "$options": "i"}

#     # Execute Search
#     total_count = await users_col.count_documents(query)
#     cursor = users_col.find(query, {
#         "username": 1, 
#         "name": 1, 
#         "highest_speed": 1, 
#         "rating": 1
#     }).sort("highest_speed", -1).skip(skip).limit(limit)
    
#     users = await cursor.to_list(length=limit)
    
#     return {
#         "users": users,
#         "total_count": total_count,
#         "total_pages": math.ceil(total_count / limit),
#         "current_page": page
#     }

from fastapi import APIRouter, Depends, Query
from backend.auth.deps import get_current_user
from backend.core.db import users_col
from bson import ObjectId
import math

router = APIRouter(prefix="/social", tags=["Social"])

@router.get("/search")
async def search_players(
    username: str = Query(None),
    min_wpm: int = Query(0),
    max_wpm: int = Query(250),
    page: int = Query(1),
    limit: int = Query(10),
    current_user: dict = Depends(get_current_user)
):
    skip = (page - 1) * limit

    # Ensure current_user["_id"] is an ObjectId for the query
    user_id = current_user["_id"]
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)
    
    # 1. Build Query - Exclude the person searching
    query = {
        "_id": {"$ne": user_id},
        "is_verified": True,
        "highest_speed": {"$gte": min_wpm, "$lte": max_wpm}
    }
    
    # 2. Add Username Filter if provided
    if username and username.strip():
        query["username"] = {"$regex": username.strip(), "$options": "i"}

    # 3. Execute Search
    total_count = await users_col.count_documents(query)
    
    # Debug print to see what's happening in server logs
    print(f"DEBUG: Searching with query: {query}")

    cursor = users_col.find(query, {
        "username": 1, 
        "name": 1, 
        "highest_speed": 1, 
        "rating": 1
    }).sort("highest_speed", -1).skip(skip).limit(limit)
    
    users = await cursor.to_list(length=limit)
    
    # Convert ObjectIDs to strings for JSON serialization
    for u in users:
        u["_id"] = str(u["_id"])
    
    return {
        "users": users,
        "total_count": total_count,
        "total_pages": math.ceil(total_count / limit) if total_count > 0 else 1,
        "current_page": page
    }
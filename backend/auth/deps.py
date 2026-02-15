from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from backend.core.config import settings
from backend.core.db import users_col
from bson import ObjectId
from bson.errors import InvalidId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await users_col.find_one({"_id": ObjectId(user_id)})

    except (JWTError, InvalidId):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    
    user["_id"] = str(user["_id"])
    return user
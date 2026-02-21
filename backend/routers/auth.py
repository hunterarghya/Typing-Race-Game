from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from backend.models.users import UserCreate, UserInDB, UserProfile
from backend.auth.pwd_utils import hash_password, verify_password, create_access_token
from backend.auth.otp_service import generate_otp, verify_otp
from backend.auth.email_utils import send_otp_email
from backend.auth.deps import get_current_user
from backend.core.db import users_col, games_col
from backend.auth.oidc import oauth
from backend.core.config import settings
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- TRADITIONAL AUTH ---

@router.post("/register")
async def register(user: UserCreate):
    # 1. Check if user exists
    if await users_col.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Save user (unverified by default)
    user_data = UserInDB(
        **user.dict(),
        hashed_password=hash_password(user.password)
    ).dict()
    # Pydantic dict() includes the raw password from UserCreate, remove it
    user_data.pop("password", None) 
    
    await users_col.insert_one(user_data)

    # 3. Generate and send OTP for verification
    otp = await generate_otp(user.email, purpose="verify")
    send_otp_email(user.email, otp, "Verify your Typing Game Account")
    
    return {"message": "Registration successful. Please check your email for the OTP."}

@router.post("/verify")
async def verify(email: str, otp: str):
    if await verify_otp(email, otp, purpose="verify"):
        await users_col.update_one({"email": email}, {"$set": {"is_verified": True}})
        return {"message": "Account verified successfully"}
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_col.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Please verify your email first")
    
    token = create_access_token({"sub": str(user["_id"]), "email": user["email"]})
    return {"access_token": token, "token_type": "bearer"}

# --- PASSWORD RESET ---

@router.post("/forgot-password")
async def forgot_password(email: str):
    user = await users_col.find_one({"email": email})
    if user:
        otp = await generate_otp(email, purpose="reset")
        send_otp_email(email, otp, "Password Reset OTP")
    # return same message to prevent user enumeration
    return {"message": "If this email is registered, an OTP has been sent."}

@router.post("/reset-password")
async def reset_password(email: str, otp: str, new_password: str):
    if await verify_otp(email, otp, purpose="reset"):
        hashed = hash_password(new_password)
        await users_col.update_one({"email": email}, {"$set": {"hashed_password": hashed}})
        return {"message": "Password updated successfully"}
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")

# --- USER PROFILE & OIDC ---

@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #------------------Remove in production-----
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------


    if "highest_speed" not in current_user:
        current_user["highest_speed"] = 0

    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    #-------------------------------------------
    return current_user
    

@router.get("/history")
async def get_game_history(
    page: int = 1, 
    limit: int = 10, 
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    skip = (page - 1) * limit

    # Query: User must be in the players list
    query = {"players.user_id": user_id}

    # Get total count for frontend pagination controls
    total_games = await games_col.count_documents(query)
    
    # Fetch only the specific page, sorted by newest first
    cursor = games_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    games = await cursor.to_list(length=limit)
    
    history_data = []
    for g in games:
        me = next((p for p in g["players"] if p["user_id"] == user_id), None)
        opponent = next((p for p in g["players"] if p["user_id"] != user_id), None)
        
        # Tie Logic
        if g.get("winner_id") is None:
            result = "TIE"
        else:
            result = "WON" if g["winner_id"] == user_id else "LOST"

        history_data.append({
            "my_wpm": me["wpm"] if me else 0,
            "my_acc": me["accuracy"] if me else 0,
            "opp_name": opponent["username"] if opponent else "Unknown",
            "opp_wpm": opponent["wpm"] if opponent else 0,
            "opp_acc": opponent["accuracy"] if opponent else 0,
            "result": result,
            "date": g["created_at"].strftime("%Y-%m-%d %H:%M")
        })

    return {
        "total_games": total_games,
        "page": page,
        "limit": limit,
        "total_pages": (total_games + limit - 1) // limit,
        "history": history_data
    }

@router.get("/login/google")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)

@router.get("/google/callback")
async def google_callback(request: Request):
    try:
        # 1. Capture the token from Google
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")

        # 2. Check if user exists in MongoDB
        user = await users_col.find_one({"email": user_info['email']})
        
        if not user:
            # 3. Create new user if they don't exist
            new_user_data = {
                "email": user_info['email'],
                "name": user_info.get('name', user_info['email'].split('@')[0]),
                "username": user_info.get('preferred_username', user_info['email'].split('@')[0]),
                "google_id": user_info['sub'],
                "is_verified": True, # Google already verified the email
                "rating": 500,
                "highest_speed": 0,
                "created_at": datetime.utcnow()
            }
            result = await users_col.insert_one(new_user_data)
            user_id = str(result.inserted_id)
        else:
            user_id = str(user["_id"])

        # 4. Generate JWT access token
        access_token = create_access_token(
            data={"sub": user_id, "email": user_info['email']}
        )

        
        response = RedirectResponse(url=f"/static/dashboard.html?token={access_token}")
        return response
    except Exception as e:
        # raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
        return RedirectResponse(url="/static/index.html?error=google_auth_failed")



# Add these new endpoints to auth.py

@router.get("/public/profile/{username}")
async def get_public_profile(username: str):
    user = await users_col.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate total games on the fly as requested
    user_id = str(user["_id"])
    total_games = await games_col.count_documents({"players.user_id": user_id})
    
    return {
        "name": user.get("name"),
        "username": user.get("username"),
        "rating": user.get("rating", 500),
        "highest_speed": user.get("highest_speed", 0),
        "total_games": total_games
    }

@router.get("/public/history/{username}")
async def get_public_history(username: str, page: int = 1, limit: int = 10):
    user = await users_col.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = str(user["_id"])
    skip = (page - 1) * limit
    query = {"players.user_id": user_id}

    total_games = await games_col.count_documents(query)
    cursor = games_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    games = await cursor.to_list(length=limit)
    
    history_data = []
    for g in games:
        # Note: 'me' here refers to the owner of the profile being viewed
        me = next((p for p in g["players"] if p["user_id"] == user_id), None)
        opponent = next((p for p in g["players"] if p["user_id"] != user_id), None)
        
        result = "TIE" if g.get("winner_id") is None else ("WON" if g["winner_id"] == user_id else "LOST")

        history_data.append({
            "my_wpm": me["wpm"] if me else 0,
            "my_acc": me["accuracy"] if me else 0,
            "opp_name": opponent["username"] if opponent else "Unknown",
            "opp_wpm": opponent["wpm"] if opponent else 0,
            "opp_acc": opponent["accuracy"] if opponent else 0,
            "result": result,
            "date": g["created_at"].strftime("%Y-%m-%d %H:%M")
        })

    return {
        "total_games": total_games,
        "history": history_data,
        "total_pages": (total_games + limit - 1) // limit
    }
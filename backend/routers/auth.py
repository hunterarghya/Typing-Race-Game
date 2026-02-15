from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from backend.models.users import UserCreate, UserInDB, UserProfile
from backend.auth.pwd_utils import hash_password, verify_password, create_access_token
from backend.auth.otp_service import generate_otp, verify_otp
from backend.auth.email_utils import send_otp_email
from backend.auth.deps import get_current_user
from backend.core.db import users_col
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
    return current_user

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

        # 5. Return the token to the frontend
        # Usually, redirect back to your frontend with the token in the URL or a cookie
        # return {
        #     "access_token": access_token, 
        #     "token_type": "bearer",
        #     "user": {
        #         "email": user_info['email'],
        #         "name": user_info.get('name')
        #     }
        # }
        response = RedirectResponse(url=f"/static/dashboard.html?token={access_token}")
        return response
    except Exception as e:
        # raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
        return RedirectResponse(url="/static/index.html?error=google_auth_failed")
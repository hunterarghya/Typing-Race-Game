from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from backend.core.config import settings

PWDCTX = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return PWDCTX.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return PWDCTX.verify(plain, hashed)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
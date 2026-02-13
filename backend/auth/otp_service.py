import random
import redis.asyncio as redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def generate_otp(email: str, purpose: str = "verify") -> str:
    otp = f"{random.randint(100000, 999999)}"
    # Store OTP with a 5-minute (300s) expiry
    key = f"otp:{purpose}:{email}"
    await redis_client.set(key, otp, ex=300)
    return otp

async def verify_otp(email: str, otp: str, purpose: str = "verify") -> bool:
    key = f"otp:{purpose}:{email}"
    stored_otp = await redis_client.get(key)
    if stored_otp and stored_otp == otp:
        await redis_client.delete(key)
        return True
    return False
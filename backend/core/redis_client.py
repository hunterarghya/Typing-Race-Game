import redis.asyncio as redis
from backend.core.config import settings

# Initialize Redis client using the URL from config
redis_client = redis.from_url(
    settings.REDIS_URL, 
    encoding="utf-8", 
    decode_responses=True
)

async def get_redis():
    return redis_client
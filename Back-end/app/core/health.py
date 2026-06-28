from fastapi import APIRouter
import redis.asyncio as aioredis
from sqlalchemy import text

from app.database.session import engine
from app.infrastructure.redis.client import get_redis_pool

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health Check")
async def health_check():
    """
    Returns the operational status of the API, database, and Redis.
    This endpoint requires no authentication.
    """
    db_status = "ok"
    redis_status = "ok"

    # Check DB connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Check Redis connectivity
    try:
        redis: aioredis.Redis = await get_redis_pool()
        await redis.ping()
    except Exception as e:
        redis_status = f"error: {str(e)}"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return {
        "status": overall,
        "services": {
            "database": db_status,
            "redis": redis_status,
        },
    }

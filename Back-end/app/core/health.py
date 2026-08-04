import logging

from fastapi import APIRouter
import redis.asyncio as aioredis
from sqlalchemy import text

from app.database.session import engine
from app.infrastructure.redis.client import get_redis_pool

logger = logging.getLogger(__name__)

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
    except Exception:
        logger.exception("Health check: database connectivity failed")
        db_status = "error"

    # Check Redis connectivity
    try:
        redis: aioredis.Redis = await get_redis_pool()
        await redis.ping()
    except Exception:
        logger.exception("Health check: redis connectivity failed")
        redis_status = "error"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return {
        "status": overall,
        "services": {
            "database": db_status,
            "redis": redis_status,
        },
    }

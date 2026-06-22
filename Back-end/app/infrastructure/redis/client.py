import redis.asyncio as aioredis
from typing import AsyncGenerator

from app.config.settings import settings

# ─── Connection Pool ───────────────────────────────────────────────────────────
_redis_pool: aioredis.Redis | None = None


async def get_redis_pool() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


async def close_redis_pool() -> None:
    global _redis_pool
    if _redis_pool is not None:
        await _redis_pool.aclose()
        _redis_pool = None


# ─── Dependency ────────────────────────────────────────────────────────────────
async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    pool = await get_redis_pool()
    yield pool


# ─── Pub/Sub Channel Names ────────────────────────────────────────────────────
class RedisChannels:
    LOW_STOCK_ALERT = "solar_erp:low_stock_alert"
    TRANSFER_STATUS_CHANGED = "solar_erp:transfer_status_changed"

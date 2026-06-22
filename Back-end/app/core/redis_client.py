"""
core/redis_client.py — DEPRECATED SHIM
=========================================
This module has been moved to app.infrastructure.redis.client.
This file remains as a backward-compatibility re-export so existing imports
don't break while you migrate each feature module.

TODO: Replace all usages of `from app.core.redis_client import ...` with
      `from app.infrastructure.redis.client import ...` and delete this file.
"""

from app.infrastructure.redis.client import (  # noqa: F401
    get_redis_pool,
    close_redis_pool,
    get_redis,
    RedisChannels,
)

__all__ = ["get_redis_pool", "close_redis_pool", "get_redis", "RedisChannels"]

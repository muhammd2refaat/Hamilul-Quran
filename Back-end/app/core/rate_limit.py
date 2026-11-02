"""
core/rate_limit.py
===================
Shared slowapi Limiter, keyed by client IP. Applied to the auth endpoints
most exposed to credential stuffing / brute force (login, refresh, Google
signup completion, admin password codes) and to the public forms — see
app/features/auth/router.py and app/features/requests/router.py.

Counts live in settings.rate_limit_storage_uri — Redis in production, so a
limit holds across all Uvicorn workers; falls back to in-memory counting if
that store is unreachable.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config.settings import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.rate_limit_storage_uri,
    in_memory_fallback_enabled=True,
)

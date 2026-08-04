"""
core/rate_limit.py
===================
Shared slowapi Limiter, keyed by client IP. Applied to the auth endpoints
most exposed to credential stuffing / brute force (login, refresh, Google
signup completion) — see app/features/auth/router.py.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

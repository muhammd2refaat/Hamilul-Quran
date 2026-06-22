from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import uuid

import bcrypt
from jose import JWTError, jwt

from app.config.settings import settings

# ─── Password Hashing ─────────────────────────────────────────────────────────


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt (cost factor 12)."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


# ─── JWT Token Creation ───────────────────────────────────────────────────────

def create_access_token(
    subject: str | uuid.UUID,
    extra_claims: Optional[dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: The user ID (UUID) as the JWT 'sub' claim.
        extra_claims: Optional dict of additional claims to embed (e.g., role).
        expires_delta: Custom TTL. Defaults to settings.access_token_expire_minutes.
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta
        else timedelta(minutes=settings.access_token_expire_minutes)
    )

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(subject: str | uuid.UUID) -> str:
    """
    Create a signed JWT refresh token with a longer TTL.
    The token ID (jti) is stored in Redis to support revocation.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.refresh_token_expire_days)
    jti = str(uuid.uuid4())

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": "refresh",
        "jti": jti,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.

    Raises:
        JWTError: If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])

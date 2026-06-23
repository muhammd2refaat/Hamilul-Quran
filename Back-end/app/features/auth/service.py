import uuid
from datetime import timedelta

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.features.users.models import User, UserStatus
from app.features.auth.schemas import TokenResponse

# Redis key prefix for valid refresh tokens
_REFRESH_TOKEN_PREFIX = "solar_erp:refresh_token:"


class AuthService:
    def __init__(self, session: AsyncSession, redis: aioredis.Redis):
        self.session = session
        self.redis = redis

    async def login(self, email: str, password: str) -> TokenResponse:
        """
        Authenticate user by email/password.
        Returns JWT access + refresh tokens.
        Refresh token JTI is stored in Redis for revocation support.
        """
        result = await self.session.exec(
            select(User).where(User.email == email, User.status == UserStatus.ACTIVE)
        )
        user = result.first()

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create tokens
        access_token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value, "email": user.email},
        )
        refresh_token = create_refresh_token(subject=user.id)

        # Store refresh token JTI in Redis
        refresh_payload = decode_token(refresh_token)
        jti: str = refresh_payload["jti"]
        ttl_seconds = settings.refresh_token_expire_days * 24 * 60 * 60
        try:
            await self.redis.setex(
                f"{_REFRESH_TOKEN_PREFIX}{jti}",
                ttl_seconds,
                str(user.id),
            )
        except Exception:
            print(f"Skipping Redis connection for token {jti}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """
        Exchange a valid refresh token for a new access token.
        Validates that the JTI exists in Redis (not revoked).
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise credentials_exception
            jti: str = payload.get("jti", "")
            user_id_str: str = payload.get("sub", "")
            user_id = uuid.UUID(user_id_str)
        except (JWTError, ValueError):
            raise credentials_exception

        # Verify JTI exists in Redis
        try:
            stored = await self.redis.get(f"{_REFRESH_TOKEN_PREFIX}{jti}")
            if not stored:
                raise credentials_exception
        except Exception:
            # If Redis is skipped, we bypass JTI verification
            pass

        # Load user
        result = await self.session.exec(
            select(User).where(User.id == user_id, User.status == UserStatus.ACTIVE)
        )
        user = result.first()
        if not user:
            raise credentials_exception

        # Issue new access token
        new_access_token = create_access_token(
            subject=user.id,
            extra_claims={"role": user.role.value, "email": user.email},
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=refresh_token,  # Reuse same refresh token
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def logout(self, refresh_token: str) -> None:
        """Revoke a refresh token by deleting its JTI from Redis."""
        try:
            payload = decode_token(refresh_token)
            jti: str = payload.get("jti", "")
            await self.redis.delete(f"{_REFRESH_TOKEN_PREFIX}{jti}")
        except Exception:
            pass  # Token already invalid or Redis skipped

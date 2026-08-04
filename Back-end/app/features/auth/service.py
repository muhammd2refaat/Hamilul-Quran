import logging
import uuid
from datetime import timedelta

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.crypto import decrypt_secret, encrypt_secret
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.features.users.models import User, UserRole, UserStatus
from app.features.auth.schemas import TokenResponse

logger = logging.getLogger(__name__)

# Redis key prefix for valid refresh tokens
_REFRESH_TOKEN_PREFIX = "hamilul_quran:refresh_token:"
# Short-lived token type for mid-login 2FA challenge
_TOTP_PENDING_TYPE = "totp_pending"
# Short-lived token type for password reset
_PASSWORD_RESET_TYPE = "password_reset"


class AuthService:
    def __init__(self, session: AsyncSession, redis: aioredis.Redis):
        self.session = session
        self.redis = redis

    async def issue_tokens_for_user(self, user: User) -> TokenResponse:
        """
        Mint a JWT access + refresh token pair for an already-authenticated user
        and store the refresh JTI in Redis for revocation support.

        Shared by password login and Google OAuth login/registration.
        """
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
            logger.warning("Skipping Redis storage for refresh token %s", jti)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def login(self, email: str, password: str):
        """
        Authenticate user by email/password.
        - Normal users: returns full TokenResponse.
        - Admins with 2FA enabled: returns a TotpPendingResponse dict with
          a short-lived `temp_token` — the client must call /auth/totp/verify.
        """
        result = await self.session.exec(
            select(User).where(User.email == email, User.status == UserStatus.ACTIVE)
        )
        user = result.first()

        # OAuth-only accounts have no local password — steer them to Google.
        if user and not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account uses Google sign-in. Please continue with Google.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Admin with 2FA enabled → issue temp token, require TOTP step
        if user.role == UserRole.ADMIN and user.totp_enabled:
            temp_token = create_access_token(
                subject=user.id,
                extra_claims={"type": _TOTP_PENDING_TYPE, "email": user.email},
                expires_delta=timedelta(minutes=5),
            )
            return {"totp_required": True, "temp_token": temp_token}

        return await self.issue_tokens_for_user(user)

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

        # Verify JTI exists in Redis (i.e. it hasn't been revoked). Revocation
        # is a security-critical check, so we fail CLOSED: if Redis can't be
        # reached, the refresh is rejected rather than silently accepted.
        try:
            stored = await self.redis.get(f"{_REFRESH_TOKEN_PREFIX}{jti}")
        except Exception:
            raise credentials_exception

        if not stored:
            raise credentials_exception

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
            pass  # Token already invalid/couldn't decode, or Redis unreachable —
            # a subsequent refresh() will fail closed on the same outage.

    # ─── Password change ──────────────────────────────────────────────────────

    async def change_password(
        self, user: User, current_password: str, new_password: str
    ) -> None:
        """Change password for a LOCAL account. Raises 400 for Google-only users,
        401 if current_password is wrong."""
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google sign-in and has no local password.",
            )
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect.",
            )
        user.password_hash = hash_password(new_password)
        self.session.add(user)
        await self.session.commit()

    # ─── Password reset ───────────────────────────────────────────────────────

    async def request_password_reset(self, email: str) -> None:
        """Generate a short-lived password-reset JWT and log it.
        Always returns without error to prevent user enumeration.
        In production, swap the logger.info call for an email delivery.
        """
        result = await self.session.exec(select(User).where(User.email == email))
        user = result.first()
        if not user or not user.password_hash:
            # No user found OR Google-only account — silently succeed.
            return

        reset_token = create_access_token(
            subject=user.id,
            extra_claims={"type": _PASSWORD_RESET_TYPE, "email": user.email},
            expires_delta=timedelta(minutes=15),
        )
        # TODO: replace with email delivery (SMTP/SendGrid) once configured.
        logger.info(
            "Password reset token for %s: %s  "
            "(In production this would be emailed to the user)",
            email,
            reset_token,
        )

    async def confirm_password_reset(self, token: str, new_password: str) -> None:
        """Verify the reset JWT and apply the new password."""
        invalid_exc = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )
        try:
            payload = decode_token(token)
        except JWTError:
            raise invalid_exc

        if payload.get("type") != _PASSWORD_RESET_TYPE:
            raise invalid_exc

        try:
            user_id = uuid.UUID(payload["sub"])
        except (KeyError, ValueError):
            raise invalid_exc

        result = await self.session.exec(
            select(User).where(User.id == user_id, User.status == UserStatus.ACTIVE)
        )
        user = result.first()
        if not user:
            raise invalid_exc

        user.password_hash = hash_password(new_password)
        self.session.add(user)
        await self.session.commit()

    # ─── TOTP 2FA ─────────────────────────────────────────────────────────────

    async def setup_totp(self, user: User) -> dict:
        """Generate and (temporarily) store a new TOTP secret.
        The secret is encrypted before storage. 2FA is NOT yet enabled —
        the user must call confirm_totp() with a valid code to activate it.
        """
        from app.features.auth.totp import generate_secret, get_provisioning_uri

        secret = generate_secret()
        user.totp_secret = encrypt_secret(secret)
        user.totp_enabled = False  # stays off until confirmed
        self.session.add(user)
        await self.session.commit()

        return {
            "secret": secret,
            "qr_uri": get_provisioning_uri(secret, user.email),
        }

    async def confirm_totp(self, user: User, code: str) -> None:
        """Verify the first TOTP code and enable 2FA for this account."""
        from app.features.auth.totp import verify_totp

        if not user.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA setup not started. Call POST /auth/totp/setup first.",
            )
        plain_secret = decrypt_secret(user.totp_secret)
        if not verify_totp(plain_secret, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid TOTP code.",
            )
        user.totp_enabled = True
        self.session.add(user)
        await self.session.commit()

    async def disable_totp(self, user: User, code: str) -> None:
        """Verify the current TOTP code and disable 2FA."""
        from app.features.auth.totp import verify_totp

        if not user.totp_enabled or not user.totp_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA is not currently enabled on this account.",
            )
        plain_secret = decrypt_secret(user.totp_secret)
        if not verify_totp(plain_secret, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid TOTP code.",
            )
        user.totp_secret = None
        user.totp_enabled = False
        self.session.add(user)
        await self.session.commit()

    async def verify_totp_login(self, temp_token: str, code: str) -> TokenResponse:
        """Complete the 2FA login: validate temp_token + TOTP code, issue real tokens."""
        from app.features.auth.totp import verify_totp

        invalid_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )
        try:
            payload = decode_token(temp_token)
        except JWTError:
            raise invalid_exc

        if payload.get("type") != _TOTP_PENDING_TYPE:
            raise invalid_exc

        try:
            user_id = uuid.UUID(payload["sub"])
        except (KeyError, ValueError):
            raise invalid_exc

        result = await self.session.exec(
            select(User).where(User.id == user_id, User.status == UserStatus.ACTIVE)
        )
        user = result.first()
        if not user or not user.totp_enabled or not user.totp_secret:
            raise invalid_exc

        plain_secret = decrypt_secret(user.totp_secret)
        if not verify_totp(plain_secret, code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code.",
            )

        return await self.issue_tokens_for_user(user)


import json
import logging
import re
import secrets
import time
import uuid
from typing import Any, Optional, Sequence
from urllib.parse import urlencode

import redis.asyncio as aioredis
from fastapi import HTTPException, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.config.settings import settings
from app.core.cookies import set_auth_cookies
from app.core.crypto import encrypt_secret
from app.features.auth.google import (
    exchange_code,
    token_expiry_from,
)
from app.features.auth.models import GoogleCredential
from app.features.auth.schemas import TokenResponse
from app.features.auth.service import AuthService
from app.features.teachers.models import IjazaType
from app.features.teachers.service import TeacherService
from app.features.users.models import (
    AuthProvider,
    Gender,
    User,
    UserRole,
    UserStatus,
)

logger = logging.getLogger(__name__)

# Redis key prefix for short-lived pending-registration handoffs.
_PENDING_PREFIX = "hamilul_quran:pending_registration:"

# In-memory fallback for the pending-registration blob when Redis is
# unavailable (mirrors the refresh-token fallback in AuthService). Keeps
# Google signup working in single-process dev without a running Redis;
# production runs Redis so this path is effectively never used there.
# {token: (blob_json, expires_at_epoch_seconds)}
_pending_fallback: dict[str, tuple[str, float]] = {}


class GoogleAuthService:
    def __init__(self, session: AsyncSession, redis: aioredis.Redis):
        self.session = session
        self.redis = redis
        self.auth = AuthService(session=session, redis=redis)
        self.teachers = TeacherService(session=session)

    # ─── Callback ────────────────────────────────────────────────────────────
    async def handle_callback(self, request: Request) -> RedirectResponse:
        """
        Complete the OAuth code exchange, then branch on whether the Google
        identity already maps to a user:
          • existing & active  → issue our JWTs, redirect to the app callback
          • new (signup)        → stash a pending registration in Redis, redirect
                                   to the profile-completion page
        """
        token = await exchange_code(request)
        userinfo: dict[str, Any] = token.get("userinfo") or {}
        google_sub = userinfo.get("sub")
        email = (userinfo.get("email") or "").lower()
        email_verified = bool(userinfo.get("email_verified"))
        if not google_sub or not email:
            return self._frontend_error("google_identity_unavailable")

        role = request.session.pop("oauth_role", None)
        intent = request.session.pop("oauth_intent", "login")

        user = await self._find_user(google_sub, email, email_verified)

        if user is None and not email_verified and await self._email_taken(email):
            # An account with this email exists, but Google hasn't verified
            # ownership of the address — refuse to silently link/take it over.
            return self._frontend_error("email_not_verified")

        if user:
            if user.status != UserStatus.ACTIVE:
                return self._frontend_error("account_inactive")
            # Backfill Google linkage for accounts created before OAuth.
            if not user.google_id:
                user.google_id = google_sub
                user.auth_provider = AuthProvider.GOOGLE
                self.session.add(user)
            await self._upsert_credential(user.id, google_sub, token)
            await self.session.commit()
            tokens = await self.auth.issue_tokens_for_user(user)
            return self._frontend_success(request, tokens, user.role.value)

        # No user yet. Logging in (not signing up) with a Google account that
        # was never registered is explicitly rejected — no auto-signup here.
        if intent != "signup" or role not in ("student", "teacher"):
            return self._frontend_error("not_registered", path="/register/required", email=email)

        return await self._start_pending_registration(role, google_sub, email, userinfo, token)

    # ─── Complete registration ───────────────────────────────────────────────
    async def complete_registration(
        self,
        *,
        registration_token: str,
        full_name: str,
        country: Optional[str],
        phone_number: Optional[str],
        age: Optional[int],
        gender: Optional[Gender],
        worked_online_before: Optional[bool],
        juz_memorized: Optional[int],
        ijazas: Sequence[IjazaType],
        certificate: Optional[UploadFile],
    ) -> TokenResponse:
        raw = await self._read_pending(registration_token)
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration session expired. Please sign in with Google again.",
            )
        data = json.loads(raw)
        role = UserRole(data["role"])
        google_sub = data["google_sub"]
        email = data["email"]

        # Idempotency: if the account was already created, just log them in.
        # Matches by google_id only (email_verified=False) — a retry of this
        # exact flow always finds its own account via google_id; we don't
        # want an email fallback here re-opening the account-takeover case
        # _find_user's email_verified gate exists to close.
        existing = await self._find_user(google_sub, email, email_verified=False)
        if existing:
            await self._delete_pending(registration_token)
            return await self.auth.issue_tokens_for_user(existing)

        first_name, last_name = _split_name(full_name)
        self._validate_required(role, country, phone_number, age, gender, worked_online_before)

        user = User(
            email=email,
            username=await self._unique_username(email),
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            password_hash=None,
            role=role,
            status=UserStatus.ACTIVE,
            auth_provider=AuthProvider.GOOGLE,
            google_id=google_sub,
            country=country,
            gender=gender,
            age=age,
        )
        self.session.add(user)
        await self.session.flush()  # populate user.id

        if role == UserRole.TEACHER:
            await self.teachers.create_profile(
                user_id=user.id,
                worked_online_before=bool(worked_online_before),
                juz_memorized=juz_memorized,
                ijazas=ijazas,
                certificate=certificate,
            )

        self._add_credential_from_blob(user.id, google_sub, data)
        await self.session.commit()
        await self.session.refresh(user)

        await self._delete_pending(registration_token)
        return await self.auth.issue_tokens_for_user(user)

    # ─── Helpers ─────────────────────────────────────────────────────────────
    async def _find_user(
        self, google_sub: str, email: str, email_verified: bool
    ) -> Optional[User]:
        """
        Match by google_id first (the identity is already linked — always
        safe). Only fall back to matching by email when Google has confirmed
        the caller actually owns that address (email_verified); otherwise an
        attacker with an unverified-email Google account could silently
        take over an existing local account, including an admin's.
        """
        result = await self.session.exec(select(User).where(User.google_id == google_sub))
        user = result.first()
        if user or not email_verified:
            return user

        result = await self.session.exec(select(User).where(User.email == email))
        return result.first()

    async def _email_taken(self, email: str) -> bool:
        result = await self.session.exec(select(User).where(User.email == email))
        return result.first() is not None

    # ─── Pending-registration storage (Redis, in-memory fallback) ────────────
    async def _store_pending(self, token: str, blob_str: str, ttl: int) -> None:
        try:
            await self.redis.setex(f"{_PENDING_PREFIX}{token}", ttl, blob_str)
        except Exception:
            logger.warning("Redis unavailable — storing pending registration in memory", exc_info=True)
            _pending_fallback[token] = (blob_str, time.time() + ttl)

    async def _read_pending(self, token: str) -> Optional[str]:
        try:
            return await self.redis.get(f"{_PENDING_PREFIX}{token}")
        except Exception:
            logger.warning("Redis unavailable — reading pending registration from memory", exc_info=True)
            entry = _pending_fallback.get(token)
            if not entry:
                return None
            blob_str, expires_at = entry
            if time.time() > expires_at:
                _pending_fallback.pop(token, None)
                return None
            return blob_str

    async def _delete_pending(self, token: str) -> None:
        try:
            await self.redis.delete(f"{_PENDING_PREFIX}{token}")
        except Exception:
            _pending_fallback.pop(token, None)

    async def _start_pending_registration(
        self,
        role: str,
        google_sub: str,
        email: str,
        userinfo: dict[str, Any],
        token: dict[str, Any],
    ) -> RedirectResponse:
        registration_token = secrets.token_urlsafe(32)
        refresh_token = token.get("refresh_token")
        expiry = token_expiry_from(token)
        blob = {
            "role": role.upper(),
            "google_sub": google_sub,
            "email": email,
            "full_name": userinfo.get("name", ""),
            # Encrypt the refresh token even in Redis (defense in depth).
            "refresh_token": encrypt_secret(refresh_token) if refresh_token else None,
            "access_token": token.get("access_token"),
            "token_expiry": expiry.isoformat() if expiry else None,
            "scopes": token.get("scope") or settings.google_oauth_scopes,
        }
        await self._store_pending(
            registration_token,
            json.dumps(blob),
            settings.registration_token_ttl_seconds,
        )
        query = urlencode({"registration_token": registration_token, "role": role})
        return RedirectResponse(
            url=f"{settings.frontend_url}/register/complete?{query}",
            status_code=status.HTTP_302_FOUND,
        )

    def _add_credential_from_blob(
        self, user_id: uuid.UUID, google_sub: str, data: dict[str, Any]
    ) -> None:
        from datetime import datetime, timezone

        expiry_raw = data.get("token_expiry")
        expiry = None
        if expiry_raw:
            expiry = datetime.fromisoformat(expiry_raw)
            if expiry.tzinfo is not None:
                # Store naive UTC to match TIMESTAMP WITHOUT TIME ZONE columns.
                expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)
        self.session.add(
            GoogleCredential(
                user_id=user_id,
                google_sub=google_sub,
                # Already encrypted in the Redis blob.
                refresh_token=data.get("refresh_token"),
                access_token=data.get("access_token"),
                token_expiry=expiry,
                scopes=data.get("scopes"),
            )
        )

    async def _upsert_credential(
        self, user_id: uuid.UUID, google_sub: str, token: dict[str, Any]
    ) -> None:
        result = await self.session.exec(
            select(GoogleCredential).where(GoogleCredential.user_id == user_id)
        )
        cred = result.first()
        refresh_token = token.get("refresh_token")
        expiry = token_expiry_from(token)
        scopes = token.get("scope") or settings.google_oauth_scopes

        if cred is None:
            cred = GoogleCredential(user_id=user_id, google_sub=google_sub)

        # Google omits the refresh token on some repeat consents — keep the old one.
        if refresh_token:
            cred.refresh_token = encrypt_secret(refresh_token)
        cred.access_token = token.get("access_token")
        cred.token_expiry = expiry
        cred.scopes = scopes
        cred.google_sub = google_sub
        self.session.add(cred)

    async def _unique_username(self, email: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9_.-]", "", email.split("@")[0]) or "user"
        candidate = base
        for _ in range(5):
            existing = await self.session.exec(
                select(User).where(User.username == candidate)
            )
            if not existing.first():
                return candidate
            candidate = f"{base}-{secrets.token_hex(3)}"
        return f"{base}-{uuid.uuid4().hex[:8]}"

    def _validate_required(
        self,
        role: UserRole,
        country: Optional[str],
        phone_number: Optional[str],
        age: Optional[int],
        gender: Optional[Gender],
        worked_online_before: Optional[bool],
    ) -> None:
        missing: list[str] = []
        if age is None:
            missing.append("age")
        if role == UserRole.STUDENT:
            if not country:
                missing.append("country")
            if not phone_number:
                missing.append("phone_number")
            if gender is None:
                missing.append("gender")
        elif role == UserRole.TEACHER:
            if worked_online_before is None:
                missing.append("worked_online_before")
        if missing:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Missing required fields: {', '.join(missing)}",
            )

    def _frontend_success(self, request: Request, tokens: TokenResponse, role: str) -> RedirectResponse:
        # Tokens also go in the URL fragment so they never hit server logs /
        # Referer — kept for backward compatibility with any client still
        # reading them from there. Browser clients should rely on the
        # HttpOnly cookies set below instead.
        fragment = urlencode(
            {
                "access_token": tokens.access_token,
                "refresh_token": tokens.refresh_token,
                "role": role,
            }
        )
        redirect = RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback#{fragment}",
            status_code=status.HTTP_302_FOUND,
        )
        set_auth_cookies(redirect, request, tokens.access_token, tokens.refresh_token)
        return redirect

    def _frontend_error(self, code: str, path: str = "/login", **extra: str) -> RedirectResponse:
        query = urlencode({"error": code, **extra})
        return RedirectResponse(
            url=f"{settings.frontend_url}{path}?{query}",
            status_code=status.HTTP_302_FOUND,
        )


def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split(" ", 1)
    first = parts[0] if parts and parts[0] else "User"
    last = parts[1] if len(parts) > 1 else ""
    return first, last

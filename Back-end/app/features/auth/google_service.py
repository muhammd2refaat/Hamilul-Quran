import json
import re
import secrets
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

# Redis key prefix for short-lived pending-registration handoffs.
_PENDING_PREFIX = "hamilul_quran:pending_registration:"


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
        if not google_sub or not email:
            return self._frontend_error("google_identity_unavailable")

        role = request.session.pop("oauth_role", None)
        intent = request.session.pop("oauth_intent", "login")

        user = await self._find_user(google_sub, email)

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
            return self._frontend_success(tokens, user.role.value)

        # No user yet. Logging in (not signing up) with a Google account that
        # was never registered is explicitly rejected — no auto-signup here.
        if intent != "signup" or role not in ("student", "teacher"):
            return self._frontend_error("not_registered", path="/login", email=email)

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
        raw = await self.redis.get(f"{_PENDING_PREFIX}{registration_token}")
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
        existing = await self._find_user(google_sub, email)
        if existing:
            await self.redis.delete(f"{_PENDING_PREFIX}{registration_token}")
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

        await self.redis.delete(f"{_PENDING_PREFIX}{registration_token}")
        return await self.auth.issue_tokens_for_user(user)

    # ─── Helpers ─────────────────────────────────────────────────────────────
    async def _find_user(self, google_sub: str, email: str) -> Optional[User]:
        result = await self.session.exec(
            select(User).where(
                (User.google_id == google_sub) | (User.email == email)
            )
        )
        return result.first()

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
        await self.redis.setex(
            f"{_PENDING_PREFIX}{registration_token}",
            settings.registration_token_ttl_seconds,
            json.dumps(blob),
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

    def _frontend_success(self, tokens: TokenResponse, role: str) -> RedirectResponse:
        # Tokens go in the URL fragment so they never hit server logs / Referer.
        fragment = urlencode(
            {
                "access_token": tokens.access_token,
                "refresh_token": tokens.refresh_token,
                "role": role,
            }
        )
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback#{fragment}",
            status_code=status.HTTP_302_FOUND,
        )

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

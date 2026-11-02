"""
features/admins/service.py
==========================
Admin accounts. One Super Admin (settings.admin_email) manages the others:
adds them, edits, deactivates and deletes them, and resets their passwords.
The Super Admin itself can never be deleted, deactivated or demoted.

New and reset admins get a server-generated temporary password by email
(never shown to the Super Admin), valid settings.admin_temp_password_hours,
and must choose their own at first sign-in. Any admin who forgot their
password can get a 6-digit code by email instead.

Every change is written to admin_audit_log.
"""
import hashlib
import hmac
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config.settings import settings
from app.core.email import send_email
from app.core.email_templates import build_admin_reset_code_email, build_admin_temp_password_email
from app.core.security import hash_password, verify_password
from app.features.admins.models import AdminAuditLog
from app.features.admins.schemas import AdminCreate, AdminUpdate, AdminWithEmailStatus, AdminResponse
from app.features.users.models import User, UserRole, UserStatus
from app.features.users.service import UserService

logger = logging.getLogger(__name__)

_OTP_PREFIX = "elhafazah:admin-otp"
# No 0/O, 1/l/I — the password is typed from an email.
_TEMP_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"

PROTECTED = "The Super Admin account can't be deleted, deactivated or changed this way"


def generate_temp_password(length: int = 12) -> str:
    while True:
        pw = "".join(secrets.choice(_TEMP_ALPHABET) for _ in range(length))
        if any(c.isdigit() for c in pw) and any(c.isalpha() for c in pw):
            return pw


def full_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


def mail_to(user: User) -> str:
    """The Super Admin's login email isn't a real inbox — use its recovery one."""
    return user.recovery_email or user.email


def guard_user_change(actor: User, target: User, *, new_role: Optional[UserRole] = None,
                      deleting: bool = False, status_change: bool = False) -> None:
    """Rules for the generic /users endpoints touching an admin account."""
    if target.is_super_admin and (deleting or status_change or (new_role and new_role != target.role)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PROTECTED)
    if new_role is not None and new_role != target.role and UserRole.ADMIN in (new_role, target.role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins are added and removed from the Admins page.",
        )
    if target.role == UserRole.ADMIN and not actor.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the Super Admin can do this")


class AdminAccountService:
    def __init__(self, session: AsyncSession, redis=None):
        self.session = session
        self.redis = redis

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _get_admin(self, admin_id: uuid.UUID) -> User:
        user = await self.session.get(User, admin_id)
        if user is None or user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        return user

    def log(self, actor: Optional[User], action: str, target: Optional[User], details: Optional[str] = None,
            actor_email: Optional[str] = None) -> None:
        self.session.add(AdminAuditLog(
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else (actor_email or "system"),
            action=action,
            target_id=target.id if target else None,
            target_email=target.email if target else None,
            details=details[:500] if details else None,
        ))

    async def _issue_temp_password(self, user: User) -> str:
        temp = generate_temp_password()
        user.password_hash = hash_password(temp)
        user.must_change_password = True
        user.temp_password_expires_at = datetime.utcnow() + timedelta(hours=settings.admin_temp_password_hours)
        user.sessions_valid_after = datetime.utcnow()
        self.session.add(user)
        return temp

    async def _email_temp_password(self, user: User, temp: str, is_new: bool) -> bool:
        subject, text_body, html_body = build_admin_temp_password_email(
            name=full_name(user), login_email=user.email, temp_password=temp,
            hours=settings.admin_temp_password_hours, admin_url=settings.admin_url, is_new=is_new,
        )
        return await send_email(mail_to(user), subject, text_body, html_body=html_body, priority="high")

    # ── Super Admin actions ──────────────────────────────────────────────────

    async def create(self, actor: User, body: AdminCreate) -> AdminWithEmailStatus:
        email = body.email.lower()
        if (await self.session.exec(select(User).where(User.email == email))).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email '{email}' is already registered")
        user = User(
            email=email, username=email, first_name=body.first_name.strip(), last_name=body.last_name.strip(),
            role=UserRole.ADMIN, status=UserStatus.ACTIVE,
        )
        temp = await self._issue_temp_password(user)
        self.log(actor, "created", user)
        await self.session.commit()
        await self.session.refresh(user)
        sent = await self._email_temp_password(user, temp, is_new=True)
        return AdminWithEmailStatus(**AdminResponse.model_validate(user).model_dump(), email_sent=sent)

    async def update(self, actor: User, admin_id: uuid.UUID, body: AdminUpdate) -> User:
        user = await self._get_admin(admin_id)
        changes = body.model_dump(exclude_unset=True)
        if "status" in changes and changes["status"] != user.status:
            if user.is_super_admin:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PROTECTED)
            if changes["status"] != UserStatus.ACTIVE:
                user.sessions_valid_after = datetime.utcnow()
        details = ", ".join(
            f"{k}: {getattr(user, k).value if hasattr(getattr(user, k), 'value') else getattr(user, k)} → "
            f"{v.value if hasattr(v, 'value') else v}"
            for k, v in changes.items() if getattr(user, k) != v
        )
        for k, v in changes.items():
            setattr(user, k, v.strip() if isinstance(v, str) else v)
        self.session.add(user)
        if details:
            self.log(actor, "updated", user, details)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete(self, actor: User, admin_id: uuid.UUID) -> None:
        user = await self._get_admin(admin_id)
        if user.is_super_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PROTECTED)
        self.log(actor, "deleted", user, full_name(user))
        await self.session.flush()
        await UserService(self.session).delete(user.id)  # commits

    async def reset_password(self, actor: User, admin_id: uuid.UUID) -> AdminWithEmailStatus:
        user = await self._get_admin(admin_id)
        if user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Change your own password from your account menu, or use Forgot password.",
            )
        temp = await self._issue_temp_password(user)
        self.log(actor, "password_reset", user)
        await self.session.commit()
        await self.session.refresh(user)
        sent = await self._email_temp_password(user, temp, is_new=False)
        return AdminWithEmailStatus(**AdminResponse.model_validate(user).model_dump(), email_sent=sent)

    async def audit_log(self, limit: int = 100) -> list[AdminAuditLog]:
        result = await self.session.exec(
            select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit)
        )
        return list(result.all())

    # ── Forgot password: emailed 6-digit code ────────────────────────────────

    def _code_hash(self, user_id: uuid.UUID, code: str) -> str:
        return hmac.new(settings.secret_key.encode(), f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()

    async def _active_admin_by_email(self, email: str) -> Optional[User]:
        result = await self.session.exec(
            select(User).where(User.email == email.lower(), User.role == UserRole.ADMIN, User.status == UserStatus.ACTIVE)
        )
        return result.first()

    async def request_code(self, email: str) -> None:
        """Always succeeds silently — the caller can't learn which emails are admins."""
        user = await self._active_admin_by_email(email)
        if user is None:
            return
        cooldown = await self.redis.set(
            f"{_OTP_PREFIX}:cooldown:{user.id}", "1", nx=True, ex=settings.admin_otp_resend_seconds
        )
        if not cooldown:
            return
        day = datetime.now(timezone.utc).strftime("%Y%m%d")
        daily_key = f"{_OTP_PREFIX}:daily:{user.id}:{day}"
        sent_today = await self.redis.incr(daily_key)
        if sent_today == 1:
            await self.redis.expire(daily_key, 86400)
        if sent_today > settings.admin_otp_daily_limit:
            logger.warning("Admin reset code limit reached for %s", user.email)
            return

        code = f"{secrets.randbelow(1_000_000):06d}"
        key = f"{_OTP_PREFIX}:code:{user.id}"
        await self.redis.delete(key)
        await self.redis.hset(key, mapping={"hash": self._code_hash(user.id, code), "attempts": 0})
        await self.redis.expire(key, settings.admin_otp_minutes * 60)

        subject, text_body, html_body = build_admin_reset_code_email(
            name=full_name(user), code=code, minutes=settings.admin_otp_minutes
        )
        await send_email(mail_to(user), subject, text_body, html_body=html_body, priority="high")

    async def confirm_code(self, email: str, code: str, new_password: str) -> None:
        invalid = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code.")
        user = await self._active_admin_by_email(email)
        if user is None:
            raise invalid
        key = f"{_OTP_PREFIX}:code:{user.id}"
        stored = await self.redis.hgetall(key)
        stored = {(k.decode() if isinstance(k, bytes) else k): (v.decode() if isinstance(v, bytes) else v)
                  for k, v in stored.items()}
        if not stored:
            raise invalid
        if not hmac.compare_digest(stored["hash"], self._code_hash(user.id, code)):
            attempts = await self.redis.hincrby(key, "attempts", 1)
            if attempts >= settings.admin_otp_max_attempts:
                await self.redis.delete(key)
            raise invalid
        await self.redis.delete(key)

        if user.password_hash and verify_password(new_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Choose a password different from your current one.")
        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        user.temp_password_expires_at = None
        user.sessions_valid_after = datetime.utcnow()
        self.session.add(user)
        self.log(user, "password_reset_by_code", user)
        await self.session.commit()

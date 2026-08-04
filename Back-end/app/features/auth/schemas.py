import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    # Optional: browser clients rely on the HttpOnly refresh_token cookie
    # instead and don't need to send this at all.
    refresh_token: Optional[str] = None


class UserInfo(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    is_active: bool


# ─── Password change (authenticated users only) ──────────────────────────────

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("new_password must be at least 8 characters")
        return v


# ─── Password reset (unauthenticated, token-based) ───────────────────────────

class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("new_password must be at least 8 characters")
        return v


# ─── TOTP 2FA ────────────────────────────────────────────────────────────────

class TotpSetupResponse(BaseModel):
    """Returned by POST /auth/totp/setup before 2FA is activated."""
    secret: str        # base32 secret (show only once — for authenticator app manual entry)
    qr_uri: str        # otpauth:// URI for QR code generation on the client


class TotpVerifyRequest(BaseModel):
    """Used for both /totp/confirm (enable) and /totp/disable."""
    code: str


class TotpLoginRequest(BaseModel):
    """Second step of the 2FA login flow."""
    temp_token: str    # short-lived JWT issued by login() when admin has 2FA enabled
    code: str


class TotpLoginResponse(TokenResponse):
    """Full token pair issued after successful TOTP verification."""
    pass

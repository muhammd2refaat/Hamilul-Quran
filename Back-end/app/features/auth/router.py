from typing import Annotated, Literal, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_session
from app.core.redis_client import get_redis
from app.core.cookies import REFRESH_TOKEN_COOKIE, clear_auth_cookies, set_auth_cookies
from app.core.dependencies import AdminDep, CurrentUserDep
from app.core.rate_limit import limiter
from app.features.auth.google import build_authorize_redirect
from app.features.auth.google_service import GoogleAuthService
from app.features.auth.schemas import (
    LoginRequest,
    PasswordChangeRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    TokenResponse,
    TotpLoginRequest,
    TotpSetupResponse,
    TotpVerifyRequest,
    RefreshRequest,
    UserInfo,
)
from app.features.auth.service import AuthService
from app.features.teachers.models import IjazaType
from app.features.users.models import Gender

router = APIRouter(prefix="/auth")


def _get_auth_service(
    session=Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
) -> AuthService:
    return AuthService(session=session, redis=redis)


def _get_google_service(
    session=Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
) -> GoogleAuthService:
    return GoogleAuthService(session=session, redis=redis)


AuthServiceDep = Annotated[AuthService, Depends(_get_auth_service)]
GoogleServiceDep = Annotated[GoogleAuthService, Depends(_get_google_service)]


@router.post(
    "/login",
    summary="Login with email & password",
    status_code=200,
)
@limiter.limit("10/minute")
async def login(request: Request, response: Response, body: LoginRequest, svc: AuthServiceDep):
    """Authenticate with email/password and receive JWT access + refresh tokens.

    If the account is an admin with 2FA enabled, returns
    `{"totp_required": true, "temp_token": "..."}` instead of tokens.
    The client must then POST /auth/totp/verify with the temp_token and a TOTP code."""
    result = await svc.login(body.email, body.password)
    # 2FA gate: result is a plain dict, not a TokenResponse
    if isinstance(result, dict) and result.get("totp_required"):
        return result
    set_auth_cookies(response, request, result.access_token, result.refresh_token)
    return result


@router.post(
    "/swagger-login",
    response_model=TokenResponse,
    summary="Login specifically for Swagger UI (OAuth2 format)",
    include_in_schema=False,
)
@limiter.limit("10/minute")
async def swagger_login(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    svc: AuthServiceDep,
):
    """Native endpoint for Swagger's green 'Authorize' button."""
    tokens = await svc.login(form_data.username, form_data.password)
    set_auth_cookies(response, request, tokens.access_token, tokens.refresh_token)
    return tokens


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    status_code=200,
)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    response: Response,
    svc: AuthServiceDep,
    body: Optional[RefreshRequest] = None,
):
    """Exchange a valid refresh token for a new access token. Browser clients
    can omit the body entirely — the refresh_token cookie is used instead."""
    token = (body.refresh_token if body else None) or request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided")

    tokens = await svc.refresh(token)
    set_auth_cookies(response, request, tokens.access_token, tokens.refresh_token)
    return tokens


@router.post(
    "/logout",
    summary="Revoke refresh token",
    status_code=204,
)
async def logout(
    request: Request,
    response: Response,
    svc: AuthServiceDep,
    body: Optional[RefreshRequest] = None,
):
    """Revoke a refresh token (deletes it from Redis) and clear auth cookies.
    Access token expires naturally."""
    token = (body.refresh_token if body else None) or request.cookies.get(REFRESH_TOKEN_COOKIE)
    if token:
        await svc.logout(token)
    clear_auth_cookies(response)


@router.get(
    "/google/login",
    summary="Start Google OAuth (login or signup) — redirects to Google",
)
async def google_login(
    request: Request,
    intent: Literal["login", "signup"] = Query("login"),
    role: Optional[Literal["student", "teacher"]] = Query(None),
):
    """
    Redirect the browser to Google's consent screen. `intent=signup` with a
    `role` collects the role so the callback can route new users to profile
    completion. Requests Calendar scope so lessons can be scheduled later.
    """
    request.session["oauth_intent"] = intent
    request.session["oauth_role"] = role
    return await build_authorize_redirect(request)


@router.get(
    "/google/callback",
    summary="Google OAuth callback — redirects back to the frontend",
)
async def google_callback(request: Request, svc: GoogleServiceDep):
    """Handle Google's redirect: issue our JWTs (existing user) or hand off to
    profile completion (new user). Always redirects back to the frontend."""
    return await svc.handle_callback(request)


@router.post(
    "/google/complete-registration",
    response_model=TokenResponse,
    summary="Finish Google signup with role-specific profile fields",
)
@limiter.limit("10/minute")
async def google_complete_registration(
    request: Request,
    response: Response,
    svc: GoogleServiceDep,
    registration_token: str = Form(...),
    full_name: str = Form(...),
    # Student fields
    country: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    gender: Optional[Gender] = Form(None),
    # Teacher fields
    worked_online_before: Optional[bool] = Form(None),
    juz_memorized: Optional[int] = Form(None),
    ijazas: list[IjazaType] = Form(default=[]),
    certificate: Optional[UploadFile] = File(None),
):
    """Create the user (+ teacher profile / ijazas) from the pending Google
    registration and return JWT access + refresh tokens."""
    tokens = await svc.complete_registration(
        registration_token=registration_token,
        full_name=full_name,
        country=country,
        phone_number=phone_number,
        age=age,
        gender=gender,
        worked_online_before=worked_online_before,
        juz_memorized=juz_memorized,
        ijazas=ijazas,
        certificate=certificate,
    )
    set_auth_cookies(response, request, tokens.access_token, tokens.refresh_token)
    return tokens


@router.get(
    "/me",
    response_model=UserInfo,
    summary="Get current authenticated user",
)
async def get_me(current_user: CurrentUserDep):
    """Returns the currently authenticated user's profile."""
    from app.features.users.models import UserStatus
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        is_active=(current_user.status == UserStatus.ACTIVE),
    )


# ─── Password change ──────────────────────────────────────────────────────────

@router.post(
    "/change-password",
    status_code=204,
    summary="Change password (authenticated, local accounts only)",
)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: PasswordChangeRequest,
    current_user: CurrentUserDep,
    svc: AuthServiceDep,
):
    """Change the current user's password. Only works for accounts with a local
    password (auth_provider=LOCAL). Google-only accounts return 400."""
    await svc.change_password(current_user, body.current_password, body.new_password)


# ─── Password reset ───────────────────────────────────────────────────────────

@router.post(
    "/password-reset/request",
    status_code=204,
    summary="Request a password reset email",
)
@limiter.limit("5/minute")
async def password_reset_request(
    request: Request,
    body: PasswordResetRequest,
    svc: AuthServiceDep,
):
    """Always returns 204 (no user enumeration). If the account exists and has
    a local password, a reset token is logged (and emailed once SMTP is set up)."""
    await svc.request_password_reset(body.email)


@router.post(
    "/password-reset/confirm",
    status_code=204,
    summary="Complete a password reset with the token from the reset link",
)
@limiter.limit("10/minute")
async def password_reset_confirm(
    request: Request,
    body: PasswordResetConfirm,
    svc: AuthServiceDep,
):
    """Apply a new password using the short-lived JWT from the reset link."""
    await svc.confirm_password_reset(body.token, body.new_password)


# ─── TOTP 2FA (admin only) ───────────────────────────────────────────────────

@router.post(
    "/totp/setup",
    response_model=TotpSetupResponse,
    summary="Begin 2FA setup — generates a TOTP secret (ADMIN only)",
)
async def totp_setup(current_user: AdminDep, svc: AuthServiceDep):
    """Generates a new TOTP secret and returns the QR code URI.
    2FA is NOT yet active until /totp/confirm is called with a valid code."""
    result = await svc.setup_totp(current_user)
    return TotpSetupResponse(**result)


@router.post(
    "/totp/confirm",
    status_code=204,
    summary="Confirm 2FA setup with first TOTP code (ADMIN only)",
)
async def totp_confirm(
    body: TotpVerifyRequest,
    current_user: AdminDep,
    svc: AuthServiceDep,
):
    """Verify the first code from the authenticator app and enable 2FA."""
    await svc.confirm_totp(current_user, body.code)


@router.post(
    "/totp/disable",
    status_code=204,
    summary="Disable 2FA (ADMIN only — requires current TOTP code)",
)
async def totp_disable(
    body: TotpVerifyRequest,
    current_user: AdminDep,
    svc: AuthServiceDep,
):
    """Disable 2FA after verifying a current TOTP code."""
    await svc.disable_totp(current_user, body.code)


@router.post(
    "/totp/verify",
    response_model=TokenResponse,
    summary="Complete 2FA login — exchange temp_token + TOTP code for real tokens",
)
@limiter.limit("10/minute")
async def totp_verify(
    request: Request,
    response: Response,
    body: TotpLoginRequest,
    svc: AuthServiceDep,
):
    """Second step of the admin 2FA login flow. Accepts the temp_token returned
    by POST /auth/login and a 6-digit TOTP code from the authenticator app."""
    tokens = await svc.verify_totp_login(body.temp_token, body.code)
    set_auth_cookies(response, request, tokens.access_token, tokens.refresh_token)
    return tokens


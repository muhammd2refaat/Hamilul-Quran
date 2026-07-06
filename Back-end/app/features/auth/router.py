from typing import Annotated, Literal, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_session
from app.core.redis_client import get_redis
from app.core.dependencies import CurrentUserDep
from app.features.auth.google import build_authorize_redirect
from app.features.auth.google_service import GoogleAuthService
from app.features.auth.schemas import LoginRequest, TokenResponse, RefreshRequest, UserInfo
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
    response_model=TokenResponse,
    summary="Login with email & password",
    status_code=200,
)
async def login(body: LoginRequest, svc: AuthServiceDep):
    """Authenticate with email/password and receive JWT access + refresh tokens."""
    return await svc.login(body.email, body.password)


@router.post(
    "/swagger-login",
    response_model=TokenResponse,
    summary="Login specifically for Swagger UI (OAuth2 format)",
    include_in_schema=False,
)
async def swagger_login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    svc: AuthServiceDep,
):
    """Native endpoint for Swagger's green 'Authorize' button."""
    return await svc.login(form_data.username, form_data.password)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    status_code=200,
)
async def refresh_token(body: RefreshRequest, svc: AuthServiceDep):
    """Exchange a valid refresh token for a new access token."""
    return await svc.refresh(body.refresh_token)


@router.post(
    "/logout",
    summary="Revoke refresh token",
    status_code=204,
)
async def logout(body: RefreshRequest, svc: AuthServiceDep):
    """Revoke a refresh token (deletes it from Redis). Access token expires naturally."""
    await svc.logout(body.refresh_token)


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
async def google_complete_registration(
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
    return await svc.complete_registration(
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

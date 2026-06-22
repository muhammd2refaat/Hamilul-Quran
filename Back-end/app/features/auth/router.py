from typing import Annotated

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_session
from app.core.redis_client import get_redis
from app.core.dependencies import CurrentUserDep
from app.features.auth.schemas import LoginRequest, TokenResponse, RefreshRequest, UserInfo
from app.features.auth.service import AuthService

router = APIRouter(prefix="/auth")


def _get_auth_service(
    session=Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
) -> AuthService:
    return AuthService(session=session, redis=redis)


AuthServiceDep = Annotated[AuthService, Depends(_get_auth_service)]


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
    "/me",
    response_model=UserInfo,
    summary="Get current authenticated user",
)
async def get_me(current_user: CurrentUserDep):
    """Returns the currently authenticated user's profile."""
    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value,
        is_active=current_user.is_active,
    )

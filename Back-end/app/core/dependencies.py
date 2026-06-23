from typing import Annotated, Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.database.session import get_session
from app.config.settings import settings
from app.core.security import decode_token
from app.features.users.models import User, UserRole, UserStatus

# ─── OAuth2 ──────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/swagger-login")

SessionDep = Annotated[AsyncSession, Depends(get_session)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


# ─── Token → User Resolution ──────────────────────────────────────────────────
async def get_current_user(
    credentials: TokenDep,
    session: SessionDep,
) -> User:
    """
    Dependency: Validates Bearer token and returns the authenticated User.
    Raises 401 on any token error or if user is not found / active.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials)
        token_type: str = payload.get("type", "")
        if token_type != "access":
            raise credentials_exception
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()

    if user is None or user.status != UserStatus.ACTIVE:
        raise credentials_exception

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


# ─── Role Guards ──────────────────────────────────────────────────────────────
async def require_admin(current_user: CurrentUserDep) -> User:
    """Dependency: Requires the authenticated user to have ADMIN role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


AdminDep = Annotated[User, Depends(require_admin)]

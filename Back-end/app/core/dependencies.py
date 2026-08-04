from typing import Annotated, Optional
import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.database.session import get_session
from app.config.settings import settings
from app.core.cookies import ACCESS_TOKEN_COOKIE
from app.core.security import decode_token
from app.features.users.models import User, UserRole, UserStatus

# ─── OAuth2 ──────────────────────────────────────────────────────────────────
# auto_error=False: a browser client authenticates via the HttpOnly cookie and
# sends no Authorization header at all, so a missing header must not 401 by
# itself — get_current_user() below falls back to the cookie before failing.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_prefix}/auth/swagger-login", auto_error=False
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]
TokenDep = Annotated[Optional[str], Depends(oauth2_scheme)]


# ─── Token → User Resolution ──────────────────────────────────────────────────
async def get_current_user(
    request: Request,
    credentials: TokenDep,
    session: SessionDep,
) -> User:
    """
    Dependency: validates the access token, taken from the Authorization
    header if present (Swagger UI, non-browser API clients) or otherwise
    from the HttpOnly access_token cookie (browser clients). Raises 401 on
    any token error, on a missing token, or if the user isn't found/active.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials or request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        raise credentials_exception
    try:
        payload = decode_token(token)
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


async def require_teacher(current_user: CurrentUserDep) -> User:
    """Dependency: Requires the authenticated user to have TEACHER role."""
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required",
        )
    return current_user


async def require_student(current_user: CurrentUserDep) -> User:
    """Dependency: Requires the authenticated user to have STUDENT role."""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required",
        )
    return current_user


AdminDep = Annotated[User, Depends(require_admin)]
TeacherDep = Annotated[User, Depends(require_teacher)]
StudentDep = Annotated[User, Depends(require_student)]

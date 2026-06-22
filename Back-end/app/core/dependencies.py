from typing import Annotated, Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database.session import get_session
from app.config.settings import settings
from app.core.security import decode_token
from app.features.users.models import User, UserRole

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
    Raises 401 on any token error or if user is not found / inactive.
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

    if user is None or not user.is_active:
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


async def require_admin_or_procurement(current_user: CurrentUserDep) -> User:
    """Dependency: Requires ADMIN or PROCUREMENT role."""
    if current_user.role not in (UserRole.ADMIN, UserRole.PROCUREMENT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Procurement access required",
        )
    return current_user


AdminDep = Annotated[User, Depends(require_admin)]
AdminOrProcurementDep = Annotated[User, Depends(require_admin_or_procurement)]


# ─── Site-Level RBAC ─────────────────────────────────────────────────────────
async def verify_site_access(
    site_id: uuid.UUID,
    current_user: User,
    session: AsyncSession,
    require_write: bool = False,
) -> None:
    """
    Core RBAC check for site-level resources.

    - ADMIN: always allowed
    - PROCUREMENT: read-only allowed; blocked on write operations
    - SITE_ACCOUNTABLE: allowed only if their assigned site matches site_id
    """
    if current_user.role == UserRole.ADMIN:
        return  # full access

    if current_user.role == UserRole.PROCUREMENT:
        if require_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Procurement role cannot modify site stock",
            )
        return  # read-only OK

    # SITE_ACCOUNTABLE — must own the site via accountable_user_id
    if current_user.role == UserRole.SITE_ACCOUNTABLE:
        from app.features.sites.models import Site
        result = await session.exec(
            select(Site).where(
                Site.id == site_id,
                Site.accountable_user_id == current_user.id,
            )
        )
        site = result.first()
        if site is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this site",
            )
        return

    # TECHNICIAN — must be assigned to the site via site_id
    if current_user.role == UserRole.TECHNICIAN:
        if require_write:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Technician role cannot modify site data",
            )
        if current_user.site_id != site_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this site",
            )
        return

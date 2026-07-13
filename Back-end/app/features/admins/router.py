from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_session
from app.core.dependencies import AdminDep
from app.features.users.models import UserRole
from app.features.users.schemas import UserCreate, UserUpdate, UserResponse, PaginatedUsers
from app.features.users.service import UserService

router = APIRouter(prefix="/admins")


def _get_svc(session=Depends(get_session)) -> UserService:
    return UserService(session=session)


SvcDep = Annotated[UserService, Depends(_get_svc)]


async def _get_admin_or_404(svc: UserService, user_id: uuid.UUID):
    user = await svc.get_by_id(user_id)
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return user


@router.get("", response_model=PaginatedUsers, summary="List admin users (ADMIN)")
async def list_admins(
    _: AdminDep,
    svc: SvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
):
    items, total = await svc.get_all(
        limit=limit, offset=offset, search=search, role=UserRole.ADMIN
    )
    return PaginatedUsers(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=UserResponse, status_code=201, summary="Create admin user (ADMIN)")
async def create_admin(_: AdminDep, svc: SvcDep, body: UserCreate):
    body.role = UserRole.ADMIN
    return await svc.create(body)


@router.patch("/{user_id}", response_model=UserResponse, summary="Update admin user (ADMIN)")
async def update_admin(user_id: uuid.UUID, body: UserUpdate, _: AdminDep, svc: SvcDep):
    await _get_admin_or_404(svc, user_id)
    # Prevent demoting an admin out of the role via this endpoint — rebuild
    # the update body without `role` regardless of what the client sent.
    sanitized = UserUpdate(**body.model_dump(exclude_unset=True, exclude={"role"}))
    return await svc.update(user_id, sanitized)


@router.delete("/{user_id}", status_code=204, summary="Permanently delete admin user (ADMIN)")
async def delete_admin(user_id: uuid.UUID, _: AdminDep, svc: SvcDep):
    await _get_admin_or_404(svc, user_id)
    await svc.delete(user_id)

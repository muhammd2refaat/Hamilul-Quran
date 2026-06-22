from typing import Annotated, Optional
import uuid

from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.users.models import UserRole
from app.features.users.schemas import UserCreate, UserUpdate, UserResponse, PaginatedUsers
from app.features.users.service import UserService

router = APIRouter(prefix="/users")


def _get_svc(session=Depends(get_session)) -> UserService:
    return UserService(session=session)


SvcDep = Annotated[UserService, Depends(_get_svc)]


@router.get("", response_model=PaginatedUsers, summary="List all users (ADMIN)")
async def list_users(
    _: AdminDep,
    svc: SvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Filter by email"),
):
    items, total = await svc.get_all(limit=limit, offset=offset, search=search)
    return PaginatedUsers(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=UserResponse, status_code=201, summary="Create user (ADMIN)")
async def create_user(_: AdminDep, svc: SvcDep, body: UserCreate):
    return await svc.create(body)


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
async def get_my_profile(current_user: CurrentUserDep):
    return current_user


@router.get("/{user_id}", response_model=UserResponse, summary="Get user by ID (ADMIN)")
async def get_user(user_id: uuid.UUID, _: AdminDep, svc: SvcDep):
    return await svc.get_by_id(user_id)


@router.patch("/{user_id}", response_model=UserResponse, summary="Update user (ADMIN)")
async def update_user(user_id: uuid.UUID, body: UserUpdate, _: AdminDep, svc: SvcDep):
    return await svc.update(user_id, body)


@router.delete("/{user_id}", status_code=204, summary="Deactivate user (ADMIN)")
async def delete_user(user_id: uuid.UUID, _: AdminDep, svc: SvcDep):
    await svc.delete(user_id)

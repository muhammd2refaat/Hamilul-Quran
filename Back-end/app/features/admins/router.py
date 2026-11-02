from typing import Annotated
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query, Request

from app.core.database import get_session
from app.core.dependencies import AdminDep, SuperAdminDep
from app.core.email import email_usage
from app.core.rate_limit import limiter
from app.core.redis_client import get_redis
from app.features.admins.schemas import (
    AdminCreate,
    AdminResponse,
    AdminUpdate,
    AdminWithEmailStatus,
    AuditEntry,
    EmailUsage,
    PaginatedAdmins,
    ResetCodeConfirm,
    ResetCodeRequest,
)
from app.features.admins.service import AdminAccountService
from app.features.users.models import UserRole
from app.features.users.service import UserService

router = APIRouter(prefix="/admins")


def _get_svc(session=Depends(get_session), redis: aioredis.Redis = Depends(get_redis)) -> AdminAccountService:
    return AdminAccountService(session=session, redis=redis)


def _get_user_svc(session=Depends(get_session)) -> UserService:
    return UserService(session=session)


SvcDep = Annotated[AdminAccountService, Depends(_get_svc)]
UserSvcDep = Annotated[UserService, Depends(_get_user_svc)]


@router.get("", response_model=PaginatedAdmins, summary="List admin users (ADMIN)")
async def list_admins(
    _: AdminDep,
    users: UserSvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
):
    items, total = await users.get_all(limit=limit, offset=offset, search=search, role=UserRole.ADMIN)
    return PaginatedAdmins(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=AdminWithEmailStatus, status_code=201,
             summary="Add an admin — a temporary password is emailed to them (SUPER ADMIN)")
async def create_admin(body: AdminCreate, actor: SuperAdminDep, svc: SvcDep):
    return await svc.create(actor, body)


@router.patch("/{admin_id}", response_model=AdminResponse, summary="Edit an admin's name or status (SUPER ADMIN)")
async def update_admin(admin_id: uuid.UUID, body: AdminUpdate, actor: SuperAdminDep, svc: SvcDep):
    return await svc.update(actor, admin_id, body)


@router.delete("/{admin_id}", status_code=204, summary="Permanently delete an admin (SUPER ADMIN)")
async def delete_admin(admin_id: uuid.UUID, actor: SuperAdminDep, svc: SvcDep):
    await svc.delete(actor, admin_id)


@router.post("/{admin_id}/reset-password", response_model=AdminWithEmailStatus,
             summary="Email an admin a new temporary password (SUPER ADMIN)")
async def reset_admin_password(admin_id: uuid.UUID, actor: SuperAdminDep, svc: SvcDep):
    return await svc.reset_password(actor, admin_id)


@router.get("/audit-log", response_model=list[AuditEntry], summary="Recent admin account changes (SUPER ADMIN)")
async def admin_audit_log(_: SuperAdminDep, svc: SvcDep, limit: int = Query(100, ge=1, le=500)):
    return await svc.audit_log(limit)


@router.get("/email-usage", response_model=EmailUsage, summary="Emails sent and blocked today (SUPER ADMIN)")
async def get_email_usage(_: SuperAdminDep):
    return await email_usage()


# ── Forgot password (no sign-in) ─────────────────────────────────────────────

@router.post("/password-code/request", status_code=204,
             summary="Email a 6-digit password reset code to an admin")
@limiter.limit("5/minute;20/day")
async def request_reset_code(request: Request, body: ResetCodeRequest, svc: SvcDep):
    """Always 204, whether or not the email belongs to an admin."""
    await svc.request_code(body.email)


@router.post("/password-code/confirm", status_code=204,
             summary="Set a new admin password with the emailed code")
@limiter.limit("10/minute;50/day")
async def confirm_reset_code(request: Request, body: ResetCodeConfirm, svc: SvcDep):
    await svc.confirm_code(body.email, body.code, body.new_password)

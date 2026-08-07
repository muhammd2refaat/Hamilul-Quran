from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.sessions.schemas import (
    AdminAttendanceItem,
    AttendanceRecordCreate,
    AttendanceResponse,
    AttendanceSummaryResponse,
)
from app.features.sessions.service import SessionService

router = APIRouter(prefix="/sessions/attendance", tags=["Attendance"])


def _get_svc(session=Depends(get_session)) -> SessionService:
    return SessionService(session=session)


SvcDep = Annotated[SessionService, Depends(_get_svc)]


@router.post(
    "",
    response_model=AttendanceResponse,
    status_code=201,
    summary="Record that I clicked Join for this session",
)
async def record_attendance(
    body: AttendanceRecordCreate, current_user: CurrentUserDep, svc: SvcDep
):
    """Fired by the frontend the moment a Join link is clicked (student or
    teacher) — ownership of the allocation is enforced in the service, not
    trusted from the client. Idempotent per (allocation, user, date)."""
    return await svc.record_attendance(current_user, body)


@router.get(
    "/summary",
    response_model=AttendanceSummaryResponse,
    summary="My own attendance totals — overall and per counterpart",
)
async def get_my_attendance_summary(current_user: CurrentUserDep, svc: SvcDep):
    """What a student/teacher themselves may see: total sessions attended,
    and a count per counterpart (each teacher for a student, each student
    for a teacher) — not the full admin-only detail log."""
    return await svc.get_attendance_summary(current_user.id, current_user.role)


@router.get(
    "",
    response_model=list[AdminAttendanceItem],
    summary="Full attendance log, both sides per session (ADMIN)",
)
async def list_attendance(_: AdminDep, svc: SvcDep):
    return await svc.get_admin_attendance()

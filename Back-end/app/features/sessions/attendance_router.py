from typing import Annotated

import uuid

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.sessions.schemas import (
    AdminAttendanceItem,
    AttendanceRecordCreate,
    AttendanceResponse,
    AttendanceSummaryResponse,
    ConfirmRequest,
    ExcuseRequest,
    JoinResponse,
    MonthlyHistoryResponse,
)
from app.features.sessions.history import monthly_history
from app.features.sessions.outcomes import AttendanceOutcomeService
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


@router.post(
    "/join/{allocation_id}",
    response_model=JoinResponse,
    summary="Open my lesson via the tracked link — records attendance, returns the Meet link",
)
async def join_lesson(allocation_id: uuid.UUID, current_user: CurrentUserDep, svc: SvcDep):
    """Used by the /join/<allocation> page linked from every calendar
    invite, so joining from Google Calendar still counts as attendance."""
    return await svc.join_now(current_user, allocation_id)


@router.patch(
    "/outcomes/{outcome_id}/excuse",
    response_model=AdminAttendanceItem,
    summary="Excuse a lesson — refunds a student no-show deduction (ADMIN)",
)
async def excuse_lesson(outcome_id: uuid.UUID, body: ExcuseRequest, _: AdminDep, svc: SvcDep):
    outcome = await AttendanceOutcomeService(svc.session).excuse(outcome_id, body.note)
    rows = await svc.get_admin_attendance()
    return next(r for r in rows if r.outcome_id == outcome.id)


@router.patch(
    "/outcomes/{outcome_id}/confirm",
    response_model=AdminAttendanceItem,
    summary="Confirm a lesson took place (joined outside the platform) — uses one session (ADMIN)",
)
async def confirm_lesson(outcome_id: uuid.UUID, body: ConfirmRequest, _: AdminDep, svc: SvcDep):
    outcome = await AttendanceOutcomeService(svc.session).confirm(outcome_id, body.note)
    rows = await svc.get_admin_attendance()
    return next(r for r in rows if r.outcome_id == outcome.id)


@router.get(
    "/history",
    response_model=MonthlyHistoryResponse,
    summary="Monthly lessons per teacher and per student — scheduled vs how they went (ADMIN)",
)
async def get_monthly_history(
    _: AdminDep,
    svc: SvcDep,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="YYYY-MM"),
):
    try:
        first = datetime.strptime(month, "%Y-%m").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="month must be YYYY-MM")
    await AttendanceOutcomeService(svc.session).finalize_due()
    return await monthly_history(svc.session, first)

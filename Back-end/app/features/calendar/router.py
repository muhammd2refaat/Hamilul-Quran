from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlmodel import select

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.auth.models import GoogleCredential
from app.features.calendar.google_calendar_client import has_calendar_access
from app.features.calendar.schemas import (
    CalendarEvent,
    CalendarConnectionStatus,
    TeacherCalendarConnection,
)
from app.features.users.models import User, UserRole
from app.features.calendar.service import CalendarService

router = APIRouter(prefix="/calendar", tags=["Calendar"])


def _get_svc(session=Depends(get_session)) -> CalendarService:
    return CalendarService(session=session)


SvcDep = Annotated[CalendarService, Depends(_get_svc)]


@router.get("/me", response_model=list[CalendarEvent], summary="My upcoming sessions")
async def get_my_calendar(
    current_user: CurrentUserDep,
    svc: SvcDep,
    weeks: int = Query(4, ge=1, le=12),
):
    return await svc.get_my_events(current_user.id, current_user.role, weeks)


@router.get("", response_model=list[CalendarEvent], summary="All upcoming sessions (ADMIN)")
async def get_all_calendar(
    _: AdminDep,
    svc: SvcDep,
    weeks: int = Query(4, ge=1, le=12),
):
    return await svc.get_all_events(weeks)


@router.get(
    "/connection",
    response_model=CalendarConnectionStatus,
    summary="Has the current user connected Google Calendar?",
)
async def get_my_calendar_connection(current_user: CurrentUserDep, session=Depends(get_session)):
    result = await session.exec(
        select(GoogleCredential).where(GoogleCredential.user_id == current_user.id)
    )
    return CalendarConnectionStatus(connected=has_calendar_access(result.first()))


@router.get(
    "/connections",
    response_model=list[TeacherCalendarConnection],
    summary="Calendar connection status for every teacher (ADMIN)",
)
async def get_teacher_calendar_connections(_: AdminDep, session=Depends(get_session)):
    result = await session.exec(
        select(User, GoogleCredential)
        .join(GoogleCredential, GoogleCredential.user_id == User.id, isouter=True)
        .where(User.role == UserRole.TEACHER)
    )
    return [
        TeacherCalendarConnection(teacher_id=user.id, connected=has_calendar_access(cred))
        for user, cred in result.all()
    ]

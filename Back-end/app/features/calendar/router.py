from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.calendar.schemas import CalendarEvent
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

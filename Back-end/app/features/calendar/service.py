from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import next_occurrence
from app.features.calendar.schemas import CalendarEvent
from app.features.users.models import User, UserRole


class CalendarService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _load_user_names(self, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
        if not user_ids:
            return {}
        result = await self.session.exec(select(User).where(User.id.in_(user_ids)))
        return {
            u.id: (f"{u.first_name} {u.last_name}".strip() or u.email)
            for u in result.all()
        }

    def _project(
        self,
        allocations: list[Allocation],
        names: dict[uuid.UUID, str],
        weeks: int,
    ) -> list[CalendarEvent]:
        events: list[CalendarEvent] = []
        # Must be timezone-aware — next_occurrence() converts it to Cairo
        # local time internally to decide "today" for the schedule's
        # Cairo-local day/time entries.
        now = datetime.now(timezone.utc)

        for alloc in allocations:
            teacher_name = names.get(alloc.teacher_id, "")
            student_name = names.get(alloc.student_id, "")

            for entry in alloc.schedule:
                day = entry.get("day")
                time_str = entry.get("time")
                if not day or not time_str:
                    continue
                try:
                    first = next_occurrence(day, time_str, now)
                except (ValueError, KeyError):
                    # Malformed schedule entry — skip rather than 500.
                    continue

                for i in range(weeks):
                    occurrence = first + timedelta(weeks=i)
                    events.append(
                        CalendarEvent(
                            id=f"{alloc.id}:{occurrence.date().isoformat()}:{time_str}",
                            date=occurrence.date(),
                            day=day,
                            time=time_str,
                            duration=alloc.duration,
                            teacher_id=alloc.teacher_id,
                            teacher_name=teacher_name,
                            student_id=alloc.student_id,
                            student_name=student_name,
                            meet_link=entry.get("meet_link"),
                        )
                    )

        events.sort(key=lambda e: (e.date, e.time))
        return events

    async def get_my_events(
        self, user_id: uuid.UUID, role: UserRole, weeks: int = 4
    ) -> list[CalendarEvent]:
        if role == UserRole.STUDENT:
            query = select(Allocation).where(Allocation.student_id == user_id)
        elif role == UserRole.TEACHER:
            query = select(Allocation).where(Allocation.teacher_id == user_id)
        else:
            return []
        result = await self.session.exec(query)
        allocations = result.all()

        user_ids = {a.teacher_id for a in allocations} | {a.student_id for a in allocations}
        names = await self._load_user_names(user_ids)
        return self._project(allocations, names, weeks)

    async def get_all_events(self, weeks: int = 4) -> list[CalendarEvent]:
        result = await self.session.exec(select(Allocation))
        allocations = result.all()

        user_ids = {a.teacher_id for a in allocations} | {a.student_id for a in allocations}
        names = await self._load_user_names(user_ids)
        return self._project(allocations, names, weeks)

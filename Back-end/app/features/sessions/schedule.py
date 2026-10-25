"""
features/sessions/schedule.py
=============================
How many lessons a student still has, and when they fall.

A subscription is a number of sessions (plan.sessions_per_week × 4), not a
calendar month. The student's lessons are their allocations' weekly slots,
in date order, from now on — the first `sessions_remaining` of them are the
paid ones, so the last of those is the subscription's end date.

That date moves by itself: a lesson that ends without using a session
(excused, refunded, nobody came) leaves the count unchanged while one slot
has passed, so the end date shifts to the next weekly slot — the session is
deferred. A renewal or manual top-up pushes it further; a pause or running
out ends it.

The result is stored on each allocation (scheduled_until). The outcome
finalizer marks lessons after it "not_scheduled" rather than "missed", and
the teacher's Google Calendar series is ended there (AllocationService).
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ, DAY_TO_PY_WEEKDAY, parse_time_str
from app.features.sessions.models import AttendeeRole, SessionAttendance
from app.features.subscriptions.models import Subscription, SubscriptionStatus

# Open-ended students (no plan-tracked subscription) — how many lessons a
# preview lists.
OPEN_ENDED_PREVIEW = 8


@dataclass(frozen=True)
class Lesson:
    allocation_id: Optional[uuid.UUID]  # None = an allocation not saved yet (preview)
    session_date: date
    day: str
    time: str
    starts: datetime


def _now_cairo(now: Optional[datetime]) -> datetime:
    return (now or datetime.now(timezone.utc)).astimezone(CAIRO_TZ)


def slot_lessons(
    allocation_id: Optional[uuid.UUID],
    schedule: Iterable[dict],
    duration: int,
    not_before: datetime,
    now_cairo: datetime,
    per_slot: int,
) -> list[Lesson]:
    """The next `per_slot` lessons of each weekly slot that haven't finished
    yet (end + finalize grace is still ahead) and don't start before
    `not_before` (when the allocation was created)."""
    grace = timedelta(minutes=settings.attendance_finalize_grace_minutes)
    out: list[Lesson] = []
    for slot in schedule or []:
        if not isinstance(slot, dict):
            continue
        day, time_str = slot.get("day"), slot.get("time")
        if day not in DAY_TO_PY_WEEKDAY or not time_str:
            continue
        try:
            t = parse_time_str(time_str)
        except ValueError:
            continue
        d = now_cairo.date() - timedelta(days=1)
        d += timedelta(days=(DAY_TO_PY_WEEKDAY[day] - d.weekday()) % 7)
        found = 0
        while found < per_slot:
            starts = datetime.combine(d, t, tzinfo=CAIRO_TZ)
            if starts >= not_before and starts + timedelta(minutes=duration) + grace > now_cairo:
                out.append(Lesson(allocation_id, d, day, time_str, starts))
                found += 1
            d += timedelta(days=7)
    return out


def _created(allocation: Allocation) -> datetime:
    return allocation.created_at.replace(tzinfo=timezone.utc).astimezone(CAIRO_TZ)


class ScheduleService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _subscription(self, student_id: uuid.UUID) -> Optional[Subscription]:
        return (
            await self.session.exec(select(Subscription).where(Subscription.student_id == student_id))
        ).first()

    @staticmethod
    def sessions_left(sub: Optional[Subscription]) -> Optional[int]:
        """Paid sessions still to be scheduled; None = open-ended. A paused
        or withdrawn subscription schedules nothing."""
        if sub is None or sub.sessions_remaining is None:
            return None
        if sub.status != SubscriptionStatus.ACTIVE:
            return 0
        return max(sub.sessions_remaining, 0)

    async def _charged_dates(self, student_id: uuid.UUID, since: date) -> set[tuple[uuid.UUID, date]]:
        """(allocation, date) of recent lessons the student already paid for
        at Join time — those don't use up a remaining session again."""
        rows = (
            await self.session.exec(
                select(SessionAttendance).where(
                    SessionAttendance.user_id == student_id,
                    SessionAttendance.role == AttendeeRole.STUDENT,
                    SessionAttendance.consumed_session.is_(True),
                    SessionAttendance.session_date >= since,
                )
            )
        ).all()
        return {(r.allocation_id, r.session_date) for r in rows}

    async def paid_lessons(
        self,
        student_id: uuid.UUID,
        allocations: list[Allocation],
        remaining: Optional[int],
        now: Optional[datetime] = None,
        extra: Optional[tuple[list[dict], int]] = None,
    ) -> list[Lesson]:
        """The student's upcoming lessons that are paid for, in date order:
        the first `remaining` (or OPEN_ENDED_PREVIEW when open-ended).
        `extra` = (schedule, duration) of an allocation being previewed."""
        now_cairo = _now_cairo(now)
        want = OPEN_ENDED_PREVIEW if remaining is None else remaining
        if want <= 0:
            return []
        charged = await self._charged_dates(student_id, now_cairo.date() - timedelta(days=1))
        lessons: list[Lesson] = []
        for a in allocations:
            lessons += [
                l for l in slot_lessons(a.id, a.schedule, a.duration, _created(a), now_cairo, want + 2)
                if (a.id, l.session_date) not in charged
            ]
        if extra is not None:
            schedule, duration = extra
            lessons += slot_lessons(None, schedule, duration, now_cairo, now_cairo, want + 2)
        lessons.sort(key=lambda l: l.starts)
        return lessons[:want]

    async def compute_until(
        self, student_id: uuid.UUID, allocations: list[Allocation], now: Optional[datetime] = None
    ) -> dict[uuid.UUID, Optional[date]]:
        """New scheduled_until for each of the student's allocations."""
        sub = await self._subscription(student_id)
        remaining = self.sessions_left(sub)
        if remaining is None:
            return {a.id: None for a in allocations}

        paid = await self.paid_lessons(student_id, allocations, remaining, now)
        if paid:
            return {a.id: paid[-1].session_date for a in allocations}

        # Nothing left to schedule: end yesterday — or today when a lesson
        # has already started today, so a lesson in progress isn't cut off.
        # An end that's already in the past stays put, so the calendar
        # isn't touched again every day.
        now_cairo = _now_cairo(now)
        today = now_cairo.date()
        started_today = any(
            l.session_date == today and l.starts <= now_cairo
            for a in allocations
            for l in slot_lessons(a.id, a.schedule, a.duration, _created(a), now_cairo, 1)
        )
        floor = today if started_today else today - timedelta(days=1)
        return {
            a.id: a.scheduled_until if a.scheduled_until is not None and a.scheduled_until <= floor else floor
            for a in allocations
        }

    async def sync_student(
        self, student_id: uuid.UUID, now: Optional[datetime] = None, create_missing: bool = False
    ) -> Optional[date]:
        """Recompute and store scheduled_until for the student's allocations,
        then bring the teacher's Google Calendar in line (best-effort).
        create_missing also creates events for slots that have none yet —
        used on explicit admin actions, not by the background loop."""
        from app.features.allocations.service import AllocationService

        allocations = list(
            (await self.session.exec(select(Allocation).where(Allocation.student_id == student_id))).all()
        )
        if not allocations:
            return None
        new_until = await self.compute_until(student_id, allocations, now)

        changed: list[tuple[Allocation, Optional[date]]] = []
        for a in allocations:
            if a.scheduled_until != new_until[a.id]:
                changed.append((a, a.scheduled_until))
                a.scheduled_until = new_until[a.id]
                self.session.add(a)
        if changed:
            await self.session.commit()

        calendar = AllocationService(self.session)
        changed_ids = {a.id for a, _ in changed}
        for a, old_until in changed:
            await calendar.apply_schedule_end(a, old_until, _now_cairo(now).date())
        if create_missing:
            for a in allocations:
                if a.id not in changed_ids:
                    await calendar.apply_schedule_end(a, a.scheduled_until, _now_cairo(now).date())
        return next(iter(new_until.values()))

    async def sync_all(self, now: Optional[datetime] = None) -> None:
        student_ids = set((await self.session.exec(select(Allocation.student_id))).all())
        for student_id in student_ids:
            await self.sync_student(student_id, now)


async def preview_allocation(
    session: AsyncSession,
    student_id: uuid.UUID,
    schedule: list[dict],
    duration: int,
    exclude_allocation_id: Optional[uuid.UUID] = None,
    now: Optional[datetime] = None,
) -> dict:
    """What saving this allocation would schedule: the student's paid
    lessons from now on (this allocation's and any others'), the last
    lesson date, and how many fall in each month."""
    svc = ScheduleService(session)
    sub = await svc._subscription(student_id)
    remaining = svc.sessions_left(sub)
    others = [
        a for a in (
            await session.exec(select(Allocation).where(Allocation.student_id == student_id))
        ).all()
        if a.id != exclude_allocation_id
    ]
    lessons = await svc.paid_lessons(student_id, others, remaining, now, extra=(schedule, duration))

    by_month: dict[str, int] = {}
    for l in lessons:
        key = l.session_date.strftime("%Y-%m")
        by_month[key] = by_month.get(key, 0) + 1
    return {
        "subscription_status": sub.status.value if sub else None,
        "plan_name": sub.plan_name if sub else None,
        "sessions_remaining": sub.sessions_remaining if sub else None,
        "open_ended": remaining is None,
        "ends_on": lessons[-1].session_date if lessons and remaining is not None else None,
        "lessons": [
            {"session_date": l.session_date, "day": l.day, "time": l.time, "this_allocation": l.allocation_id is None}
            for l in lessons
        ],
        "by_month": [{"month": m, "count": c} for m, c in by_month.items()],
    }

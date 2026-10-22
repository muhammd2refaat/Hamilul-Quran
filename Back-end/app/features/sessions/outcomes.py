"""
features/sessions/outcomes.py
=============================
Lesson outcomes: once a scheduled lesson has ended, record how it went —
both joined / teacher only / student only / missed — and apply the session
rules to the student's subscription.

Session rules (applied once per occurrence, on top of the existing
deduct-on-Join behaviour in SessionService.record_attendance):

  both          nothing — the student was already charged when they joined
  student_only  teacher no-show: refund the session the student's Join click
                deducted (only if it actually deducted one)
  teacher_only  student no-show: deduct one session, when
                settings.attendance_charge_student_no_show is on and the
                subscription is active with sessions left
  missed        nothing — nobody came
  excused       set later by an admin; refunds a no-show deduction

"Joined" means clicked Join inside the platform (dashboard button or the
tracked /join link in the calendar invite) — the platform can't see inside
Google Meet.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Iterator, Optional

from fastapi import HTTPException, status
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import (
    CAIRO_TZ,
    DAY_TO_PY_WEEKDAY,
    parse_time_str,
)
from app.features.sessions.models import (
    AttendeeRole,
    OutcomeStatus,
    SessionAttendance,
    SessionOutcome,
)
from app.features.subscriptions.models import Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Occurrence:
    session_date: date
    day: str
    time: str


def _as_cairo(dt_naive_utc: datetime) -> datetime:
    return dt_naive_utc.replace(tzinfo=timezone.utc).astimezone(CAIRO_TZ)


def ended_occurrences(
    allocation: Allocation, start: date, now_cairo: datetime, grace: timedelta
) -> Iterator[Occurrence]:
    """Every weekly occurrence of this allocation's schedule that falls on or
    after `start`, started after the allocation existed, and ended (plus
    grace) before now."""
    created = _as_cairo(allocation.created_at)
    first_day = max(start, created.date())
    for slot in allocation.schedule or []:
        if not isinstance(slot, dict):
            continue
        day, time_str = slot.get("day"), slot.get("time")
        if day not in DAY_TO_PY_WEEKDAY or not time_str:
            continue
        try:
            slot_time = parse_time_str(time_str)
        except ValueError:
            continue
        d = first_day + timedelta(days=(DAY_TO_PY_WEEKDAY[day] - first_day.weekday()) % 7)
        while d <= now_cairo.date():
            starts = datetime.combine(d, slot_time, tzinfo=CAIRO_TZ)
            if starts >= created and starts + timedelta(minutes=allocation.duration) + grace <= now_cairo:
                yield Occurrence(d, day, time_str)
            d += timedelta(days=7)


def classify(teacher_joined: bool, student_joined: bool) -> OutcomeStatus:
    if teacher_joined and student_joined:
        return OutcomeStatus.BOTH
    if teacher_joined:
        return OutcomeStatus.TEACHER_ONLY
    if student_joined:
        return OutcomeStatus.STUDENT_ONLY
    return OutcomeStatus.MISSED


class AttendanceOutcomeService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def finalize_due(self, now: Optional[datetime] = None) -> int:
        """Record an outcome for every lesson that has ended and doesn't have
        one yet. Safe to run concurrently (two Uvicorn workers both run the
        loop): the unique constraint decides which run applies the session
        adjustment. Returns the number of outcomes this run recorded."""
        start = settings.attendance_outcomes_start_date
        if start is None:
            return 0
        now_cairo = (now or datetime.now(timezone.utc)).astimezone(CAIRO_TZ)
        grace = timedelta(minutes=settings.attendance_finalize_grace_minutes)

        allocations = (await self.session.exec(select(Allocation))).all()
        recorded = 0
        for allocation in allocations:
            due = list(ended_occurrences(allocation, start, now_cairo, grace))
            if not due:
                continue
            done = {
                (o.session_date, o.scheduled_time)
                for o in (
                    await self.session.exec(
                        select(SessionOutcome).where(SessionOutcome.allocation_id == allocation.id)
                    )
                ).all()
            }
            for occ in due:
                if (occ.session_date, occ.time) in done:
                    continue
                if await self._finalize_one(allocation, occ):
                    recorded += 1
            await self.session.commit()
        return recorded

    async def _finalize_one(self, allocation: Allocation, occ: Occurrence) -> bool:
        rows = (
            await self.session.exec(
                select(SessionAttendance).where(
                    SessionAttendance.allocation_id == allocation.id,
                    SessionAttendance.session_date == occ.session_date,
                )
            )
        ).all()
        teacher_row = next((r for r in rows if r.role == AttendeeRole.TEACHER), None)
        student_row = next((r for r in rows if r.role == AttendeeRole.STUDENT), None)
        outcome_status = classify(teacher_row is not None, student_row is not None)

        outcome_id = uuid.uuid4()
        inserted = (
            await self.session.execute(
                pg_insert(SessionOutcome)
                .values(
                    id=outcome_id,
                    allocation_id=allocation.id,
                    session_date=occ.session_date,
                    scheduled_day=occ.day,
                    scheduled_time=occ.time,
                    status=outcome_status.value,
                    session_charge=0,
                    finalized_at=datetime.utcnow(),
                )
                .on_conflict_do_nothing(constraint="uq_session_outcome")
                .returning(SessionOutcome.id)
            )
        ).first()
        if inserted is None:
            return False  # another worker finalized it first

        charge = 0
        if outcome_status == OutcomeStatus.STUDENT_ONLY and student_row and student_row.consumed_session:
            if await self._adjust_sessions(allocation.student_id, +1):
                charge = -1
                # Never refund the same Join click twice (two slots on one day).
                student_row.consumed_session = False
                self.session.add(student_row)
        elif outcome_status == OutcomeStatus.TEACHER_ONLY and settings.attendance_charge_student_no_show:
            if await self._adjust_sessions(allocation.student_id, -1, require_active=True):
                charge = 1

        if charge:
            outcome = await self.session.get(SessionOutcome, outcome_id)
            outcome.session_charge = charge
            self.session.add(outcome)
        return True

    async def _adjust_sessions(self, student_id: uuid.UUID, delta: int, require_active: bool = False) -> bool:
        """Add `delta` sessions (negative = deduct). Deductions need sessions
        left and, when require_active, an active subscription; refunds only
        need a plan-tracked subscription. Returns whether it changed."""
        sub = (
            await self.session.exec(select(Subscription).where(Subscription.student_id == student_id))
        ).first()
        if sub is None or sub.sessions_remaining is None:
            return False
        if delta < 0:
            if require_active and sub.status != SubscriptionStatus.ACTIVE:
                return False
            if sub.sessions_remaining <= 0:
                return False
        sub.sessions_remaining += delta
        self.session.add(sub)
        return True

    async def excuse(self, outcome_id: uuid.UUID, note: Optional[str]) -> SessionOutcome:
        """Admin marks a lesson excused (holiday, illness, technical problem)
        so it doesn't count against the student. Refunds a student no-show
        deduction (+1); a teacher no-show refund (-1) already favours the
        student and stays. A session deducted by the student's own Join
        click is left alone — from the student's side that lesson happened."""
        outcome = await self.session.get(SessionOutcome, outcome_id)
        if outcome is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson outcome not found")
        if outcome.session_charge == 1:
            allocation = await self.session.get(Allocation, outcome.allocation_id)
            if allocation is not None and await self._adjust_sessions(allocation.student_id, +1):
                outcome.session_charge = 0
        outcome.status = OutcomeStatus.EXCUSED.value
        outcome.note = (note or "").strip() or None
        self.session.add(outcome)
        await self.session.commit()
        await self.session.refresh(outcome)
        return outcome

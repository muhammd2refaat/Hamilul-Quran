import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.features.allocations.models import Allocation
from app.features.sessions.models import (
    AttendeeRole,
    SessionAttendance,
    SessionOutcome,
    SessionScore,
    TeacherHistory,
)
from app.features.sessions.schemas import (
    AdminAttendanceItem,
    AttendanceRecordCreate,
    AttendanceSummaryItem,
    AttendanceSummaryResponse,
    SessionScoreCreate,
)
from app.features.subscriptions.models import Subscription
from app.features.users.models import User, UserRole

# Matches Frontend/lib/dashboard/calendarUtils.ts JOIN_OPENS_MINUTES_BEFORE.
JOIN_OPENS_MINUTES_BEFORE = 15


class SessionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_student_teacher_history(self, user_id: uuid.UUID) -> list[TeacherHistory]:
        query = select(TeacherHistory).where(TeacherHistory.student_id == user_id).order_by(TeacherHistory.assigned_at.desc())
        result = await self.session.exec(query)
        return result.all()

    async def get_student_session_scores(self, user_id: uuid.UUID) -> list[SessionScore]:
        query = select(SessionScore).where(SessionScore.student_id == user_id).order_by(SessionScore.date.desc())
        result = await self.session.exec(query)
        return result.all()

    async def get_current_teacher_id(self, student_id: uuid.UUID) -> Optional[uuid.UUID]:
        result = await self.session.exec(
            select(TeacherHistory)
            .where(TeacherHistory.student_id == student_id)
            .where(TeacherHistory.unassigned_at.is_(None))
            .order_by(TeacherHistory.assigned_at.desc())
        )
        entry = result.first()
        return entry.teacher_id if entry else None

    async def create_score(
        self, data: SessionScoreCreate, teacher_id: uuid.UUID
    ) -> SessionScore:
        """Record a session score. Commits — this is a standalone write, not
        part of a larger multi-model transaction."""
        score = SessionScore(
            student_id=data.student_id,
            teacher_id=teacher_id,
            score=data.score,
            max_score=data.max_score,
            surah=data.surah,
            teacher_comment=data.teacher_comment,
            notes=data.notes,
            recitation_type=data.recitation_type,
        )
        self.session.add(score)
        await self.session.commit()
        await self.session.refresh(score)
        return score

    async def create_history_entry(
        self,
        student_id: uuid.UUID,
        teacher_id: uuid.UUID,
        assigned_at: Optional[datetime] = None,
    ) -> TeacherHistory:
        """Add a new TeacherHistory row. Adds to the session but does NOT
        commit — the caller (e.g. AllocationService) owns the transaction."""
        entry = TeacherHistory(
            student_id=student_id,
            teacher_id=teacher_id,
            assigned_at=assigned_at or datetime.utcnow(),
        )
        self.session.add(entry)
        return entry

    async def reassign_teacher(
        self,
        student_id: uuid.UUID,
        new_teacher_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> TeacherHistory:
        """
        Close out the student's currently-open TeacherHistory row (if any)
        and open a new one for new_teacher_id. Adds to the session but does
        NOT commit — the caller owns the transaction.
        """
        open_entry_result = await self.session.exec(
            select(TeacherHistory)
            .where(TeacherHistory.student_id == student_id)
            .where(TeacherHistory.unassigned_at.is_(None))
            .order_by(TeacherHistory.assigned_at.desc())
        )
        open_entry = open_entry_result.first()

        now = datetime.utcnow()
        if open_entry and open_entry.teacher_id == new_teacher_id:
            # Already assigned to this teacher — nothing to transition.
            return open_entry

        if open_entry:
            open_entry.unassigned_at = now
            open_entry.reason = reason
            self.session.add(open_entry)

        return await self.create_history_entry(student_id, new_teacher_id, assigned_at=now)

    # ─── Attendance (Join-button click tracking) ────────────────────────────────

    async def record_attendance(
        self, user: User, data: AttendanceRecordCreate
    ) -> SessionAttendance:
        """Record that `user` clicked Join for this allocation's session on
        this date. Idempotent — clicking Join five times for the same
        session records one attendance row, not five."""
        allocation = await self.session.get(Allocation, data.allocation_id)
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation not found")

        if user.id == allocation.teacher_id:
            role = AttendeeRole.TEACHER
        elif user.id == allocation.student_id:
            role = AttendeeRole.STUDENT
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not part of this allocation",
            )

        existing_result = await self.session.exec(
            select(SessionAttendance).where(
                SessionAttendance.allocation_id == data.allocation_id,
                SessionAttendance.user_id == user.id,
                SessionAttendance.session_date == data.session_date,
            )
        )
        existing = existing_result.first()
        if existing:
            return existing

        record = SessionAttendance(
            allocation_id=data.allocation_id,
            user_id=user.id,
            role=role,
            session_date=data.session_date,
            scheduled_day=data.scheduled_day,
            scheduled_time=data.scheduled_time,
        )
        self.session.add(record)

        if role == AttendeeRole.STUDENT:
            record.consumed_session = await self._consume_session(allocation.student_id)

        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def join_now(self, user: User, allocation_id: uuid.UUID) -> "JoinResponse":
        """
        Behind the tracked /join/<allocation> link put in every calendar
        invite: if one of this allocation's lessons is open right now (from
        15 minutes before its start until it ends, Cairo time — the same
        window as the dashboard Join buttons), record the caller's attendance
        and hand back the Meet link. Otherwise say why, without recording.
        """
        from app.features.calendar.google_calendar_client import CAIRO_TZ, parse_time_str
        from app.features.sessions.schemas import JoinResponse

        allocation = await self.session.get(Allocation, allocation_id)
        if not allocation:
            raise HTTPException(status_code=404, detail="Lesson not found")
        if user.id not in (allocation.teacher_id, allocation.student_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not part of this lesson")

        return await self._join_at(user, allocation, datetime.now(CAIRO_TZ))

    async def _join_at(self, user: User, allocation: Allocation, now: datetime) -> "JoinResponse":
        from app.features.calendar.google_calendar_client import CAIRO_TZ, parse_time_str
        from app.features.sessions.schemas import JoinResponse

        day_ids = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
        # Yesterday/tomorrow too: a midnight lesson opens at 11:45 PM the day
        # before, and a late lesson can run past midnight into the next day.
        for offset in (0, 1, -1):
            lesson_date = now.date() + timedelta(days=offset)
            day_id = day_ids[lesson_date.weekday()]
            for slot in allocation.schedule or []:
                if not isinstance(slot, dict) or slot.get("day") != day_id or not slot.get("time"):
                    continue
                try:
                    starts = datetime.combine(lesson_date, parse_time_str(slot["time"]), tzinfo=CAIRO_TZ)
                except ValueError:
                    continue
                opens = starts - timedelta(minutes=JOIN_OPENS_MINUTES_BEFORE)
                ends = starts + timedelta(minutes=allocation.duration)
                if not (opens <= now <= ends):
                    continue
                if not slot.get("meet_link"):
                    return JoinResponse(recorded=False, reason="no_meet_link")
                await self.record_attendance(
                    user,
                    AttendanceRecordCreate(
                        allocation_id=allocation.id,
                        session_date=lesson_date,
                        scheduled_day=day_id,
                        scheduled_time=slot["time"],
                    ),
                )
                return JoinResponse(recorded=True, meet_link=slot["meet_link"])
        return JoinResponse(recorded=False, reason="not_open")

    async def _consume_session(self, student_id: uuid.UUID) -> bool:
        """Best-effort: decrement the student's subscription session count
        by one, floored at 0, when their attendance is newly recorded. A
        student with no subscription, or a legacy subscription with no
        linked plan (sessions_remaining is None), is left untouched rather
        than treated as an error — attendance tracking must never fail
        because billing/plan data happens to be incomplete for this student.

        Returns whether a session was actually deducted — stored on the
        attendance row so a later teacher no-show refund is exact."""
        result = await self.session.exec(
            select(Subscription).where(Subscription.student_id == student_id)
        )
        subscription = result.first()
        if subscription is None or not subscription.sessions_remaining:
            return False
        subscription.sessions_remaining -= 1
        self.session.add(subscription)
        return True

    async def get_attendance_summary(
        self, user_id: uuid.UUID, role: UserRole
    ) -> AttendanceSummaryResponse:
        """This user's own attendance: total distinct sessions attended,
        broken down by counterpart (each teacher a student has had, or each
        student a teacher has had)."""
        query = select(SessionAttendance).where(SessionAttendance.user_id == user_id)
        result = await self.session.exec(query)
        records = result.all()

        total_sessions = len({r.session_date for r in records})

        by_allocation: dict[uuid.UUID, set] = {}
        for r in records:
            by_allocation.setdefault(r.allocation_id, set()).add(r.session_date)

        items: list[AttendanceSummaryItem] = []
        for allocation_id, dates in by_allocation.items():
            allocation = await self.session.get(Allocation, allocation_id)
            if not allocation:
                continue
            counterpart_id = (
                allocation.student_id if role == UserRole.TEACHER else allocation.teacher_id
            )
            counterpart = await self.session.get(User, counterpart_id)
            counterpart_name = (
                f"{counterpart.first_name} {counterpart.last_name}".strip() or counterpart.email
                if counterpart
                else "Unknown"
            )
            items.append(
                AttendanceSummaryItem(
                    allocation_id=allocation_id,
                    counterpart_id=counterpart_id,
                    counterpart_name=counterpart_name,
                    session_count=len(dates),
                )
            )

        items.sort(key=lambda i: i.session_count, reverse=True)
        return AttendanceSummaryResponse(total_sessions=total_sessions, by_counterpart=items)

    async def get_admin_attendance(self) -> list[AdminAttendanceItem]:
        """Full attendance log — one row per lesson occurrence, student and
        teacher side by side, with its outcome. Finished lessons nobody
        joined appear as "missed" rather than being absent from the log.
        Runs a finalization pass first so the log is current even if the
        background loop hasn't ticked yet."""
        from app.features.sessions.outcomes import AttendanceOutcomeService

        await AttendanceOutcomeService(self.session).finalize_due()

        attendance = (await self.session.exec(select(SessionAttendance))).all()
        by_day: dict[tuple[uuid.UUID, object], dict] = {}
        for r in attendance:
            by_day.setdefault((r.allocation_id, r.session_date), {})[r.role] = r

        outcomes = (await self.session.exec(select(SessionOutcome))).all()
        allocations: dict[uuid.UUID, Optional[Allocation]] = {}
        users: dict[uuid.UUID, Optional[User]] = {}

        async def _alloc(aid):
            if aid not in allocations:
                allocations[aid] = await self.session.get(Allocation, aid)
            return allocations[aid]

        async def _user(uid):
            if uid not in users:
                users[uid] = await self.session.get(User, uid)
            return users[uid]

        def _name(u: Optional[User]) -> str:
            return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else "Unknown"

        out: list[AdminAttendanceItem] = []

        async def _row(aid, session_date, day, time, outcome: Optional[SessionOutcome]):
            allocation = await _alloc(aid)
            if not allocation:
                return
            joined = by_day.get((aid, session_date), {})
            student_rec = joined.get(AttendeeRole.STUDENT)
            teacher_rec = joined.get(AttendeeRole.TEACHER)
            out.append(
                AdminAttendanceItem(
                    allocation_id=aid,
                    session_date=session_date,
                    scheduled_day=day,
                    scheduled_time=time,
                    student_id=allocation.student_id,
                    student_name=_name(await _user(allocation.student_id)),
                    student_joined_at=student_rec.joined_at if student_rec else None,
                    teacher_id=allocation.teacher_id,
                    teacher_name=_name(await _user(allocation.teacher_id)),
                    teacher_joined_at=teacher_rec.joined_at if teacher_rec else None,
                    status=outcome.status if outcome else "pending",
                    outcome_id=outcome.id if outcome else None,
                    session_charge=outcome.session_charge if outcome else 0,
                    note=outcome.note if outcome else None,
                )
            )

        finalized_days = set()
        for o in outcomes:
            finalized_days.add((o.allocation_id, o.session_date))
            await _row(o.allocation_id, o.session_date, o.scheduled_day, o.scheduled_time, o)

        # Joins not finalized yet: lessons in progress today, or from before
        # attendance_outcomes_start_date (shown as they always were).
        for (aid, session_date), joined in by_day.items():
            if (aid, session_date) in finalized_days:
                continue
            any_rec = joined.get(AttendeeRole.STUDENT) or joined.get(AttendeeRole.TEACHER)
            await _row(aid, session_date, any_rec.scheduled_day, any_rec.scheduled_time, None)

        out.sort(key=lambda i: (i.session_date, i.scheduled_time), reverse=True)
        return out

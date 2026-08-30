import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.features.allocations.models import Allocation
from app.features.sessions.models import (
    AttendeeRole,
    SessionAttendance,
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
            await self._consume_session(allocation.student_id)

        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def _consume_session(self, student_id: uuid.UUID) -> None:
        """Best-effort: decrement the student's subscription session count
        by one, floored at 0, when their attendance is newly recorded. A
        student with no subscription, or a legacy subscription with no
        linked plan (sessions_remaining is None), is left untouched rather
        than treated as an error — attendance tracking must never fail
        because billing/plan data happens to be incomplete for this student."""
        result = await self.session.exec(
            select(Subscription).where(Subscription.student_id == student_id)
        )
        subscription = result.first()
        if subscription is None or subscription.sessions_remaining is None:
            return
        subscription.sessions_remaining = max(0, subscription.sessions_remaining - 1)
        self.session.add(subscription)

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
        """Full attendance log — one row per (allocation, session_date)
        occurrence, student and teacher attendance shown side by side."""
        result = await self.session.exec(
            select(SessionAttendance).order_by(SessionAttendance.session_date.desc())
        )
        records = result.all()

        grouped: dict[tuple[uuid.UUID, object], dict] = {}
        for r in records:
            key = (r.allocation_id, r.session_date)
            grouped.setdefault(key, {})[r.role] = r

        out: list[AdminAttendanceItem] = []
        for (allocation_id, session_date), by_role in grouped.items():
            allocation = await self.session.get(Allocation, allocation_id)
            if not allocation:
                continue
            student = await self.session.get(User, allocation.student_id)
            teacher = await self.session.get(User, allocation.teacher_id)
            student_rec = by_role.get(AttendeeRole.STUDENT)
            teacher_rec = by_role.get(AttendeeRole.TEACHER)
            any_rec = student_rec or teacher_rec

            out.append(
                AdminAttendanceItem(
                    allocation_id=allocation_id,
                    session_date=session_date,
                    scheduled_day=any_rec.scheduled_day if any_rec else "",
                    scheduled_time=any_rec.scheduled_time if any_rec else "",
                    student_id=allocation.student_id,
                    student_name=(
                        f"{student.first_name} {student.last_name}".strip() or student.email
                        if student
                        else "Unknown"
                    ),
                    student_joined_at=student_rec.joined_at if student_rec else None,
                    teacher_id=allocation.teacher_id,
                    teacher_name=(
                        f"{teacher.first_name} {teacher.last_name}".strip() or teacher.email
                        if teacher
                        else "Unknown"
                    ),
                    teacher_joined_at=teacher_rec.joined_at if teacher_rec else None,
                )
            )

        out.sort(key=lambda i: i.session_date, reverse=True)
        return out

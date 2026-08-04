import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.features.sessions.models import TeacherHistory, SessionScore
from app.features.sessions.schemas import SessionScoreCreate


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

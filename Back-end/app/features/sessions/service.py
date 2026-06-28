import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.features.sessions.models import TeacherHistory, SessionScore

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

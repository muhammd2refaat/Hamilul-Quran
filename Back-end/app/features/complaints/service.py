import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.features.complaints.models import Complaint

class ComplaintService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_complaints(self, user_id: uuid.UUID) -> list[Complaint]:
        query = select(Complaint).where(Complaint.user_id == user_id).order_by(Complaint.created_at.desc())
        result = await self.session.exec(query)
        return result.all()

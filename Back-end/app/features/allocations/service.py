import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.features.allocations.models import Allocation
from app.features.allocations.schemas import AllocationCreate

class AllocationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self) -> list[Allocation]:
        query = select(Allocation).order_by(Allocation.created_at.desc())
        result = await self.session.exec(query)
        return result.all()

    async def get_user_allocations(self, user_id: uuid.UUID, role: str) -> list[Allocation]:
        from app.features.users.models import UserRole
        if role == UserRole.STUDENT:
            query = select(Allocation).where(Allocation.student_id == user_id).order_by(Allocation.created_at.desc())
        elif role == UserRole.TEACHER:
            query = select(Allocation).where(Allocation.teacher_id == user_id).order_by(Allocation.created_at.desc())
        else:
            return []
        result = await self.session.exec(query)
        return result.all()

    async def create(self, body: AllocationCreate) -> Allocation:
        # Convert schema to DB model
        allocation = Allocation(
            teacher_id=body.teacher_id,
            student_id=body.student_id,
            sessions_per_week=body.sessions_per_week,
            duration=body.duration,
            schedule=[s.model_dump() for s in body.schedule]
        )
        self.session.add(allocation)
        await self.session.commit()
        await self.session.refresh(allocation)
        return allocation

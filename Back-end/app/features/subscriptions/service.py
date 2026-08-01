import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status

from app.features.subscriptions.models import Subscription
from app.features.subscriptions.schemas import SubscriptionUpsert
from app.features.users.models import User


class SubscriptionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self) -> list[dict]:
        query = (
            select(Subscription, User)
            .join(User, Subscription.student_id == User.id)
            .order_by(Subscription.created_at.desc())
        )
        result = await self.session.exec(query)
        rows = result.all()

        out = []
        for sub, student in rows:
            s_dict = sub.model_dump()
            s_dict["student_name"] = f"{student.first_name} {student.last_name}".strip() or student.email
            out.append(s_dict)
        return out

    async def get_for_student(self, student_id: uuid.UUID) -> Subscription:
        result = await self.session.exec(
            select(Subscription).where(Subscription.student_id == student_id)
        )
        subscription = result.first()
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="No subscription found for this student"
            )
        return subscription

    async def upsert(self, student_id: uuid.UUID, body: SubscriptionUpsert) -> Subscription:
        result = await self.session.exec(
            select(Subscription).where(Subscription.student_id == student_id)
        )
        subscription = result.first()

        if subscription is None:
            subscription = Subscription(student_id=student_id, **body.model_dump())
        else:
            for field, value in body.model_dump().items():
                setattr(subscription, field, value)

        self.session.add(subscription)
        await self.session.commit()
        await self.session.refresh(subscription)
        return subscription

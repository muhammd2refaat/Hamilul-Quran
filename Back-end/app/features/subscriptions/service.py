import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException, status

from app.features.subscriptions.models import Plan, Subscription, SubscriptionStatus
from app.features.subscriptions.schemas import PlanCreate, PlanUpdate, SubscriptionUpsert
from app.features.users.models import User

# sessions_remaining resets to sessions_per_week × this many weeks whenever a
# plan is newly assigned or changed — i.e. one subscription "cycle" — until
# there's real recurring billing to key the reset off of instead. An admin
# can always override the resulting number directly (SubscriptionUpsert.
# sessions_remaining), which is also how a session gets extended/deferred.
DEFAULT_BILLING_WEEKS = 4


class PlanService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self, include_inactive: bool = True) -> list[Plan]:
        query = select(Plan).order_by(Plan.price)
        if not include_inactive:
            query = query.where(Plan.is_active.is_(True))
        result = await self.session.exec(query)
        return result.all()

    async def get(self, plan_id: uuid.UUID) -> Plan:
        plan = await self.session.get(Plan, plan_id)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
        return plan

    async def create(self, body: PlanCreate) -> Plan:
        plan = Plan(**body.model_dump())
        self.session.add(plan)
        await self.session.commit()
        await self.session.refresh(plan)
        return plan

    async def update(self, plan_id: uuid.UUID, body: PlanUpdate) -> Plan:
        plan = await self.get(plan_id)
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(plan, field, value)
        self.session.add(plan)
        await self.session.commit()
        await self.session.refresh(plan)
        return plan

    async def deactivate(self, plan_id: uuid.UUID) -> None:
        """Soft-delete: existing subscriptions keep referencing this plan
        (its name/price/sessions still resolve fine), it just stops being
        offered to new students. Never hard-deleted — see the FK from
        subscriptions.plan_id."""
        plan = await self.get(plan_id)
        plan.is_active = False
        self.session.add(plan)
        await self.session.commit()


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
            out.append(await self._to_dict(sub, student_name=f"{student.first_name} {student.last_name}".strip() or student.email))
        return out

    async def get_for_student(self, student_id: uuid.UUID) -> dict:
        result = await self.session.exec(
            select(Subscription).where(Subscription.student_id == student_id)
        )
        subscription = result.first()
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="No subscription found for this student"
            )
        return await self._to_dict(subscription)

    async def upsert(self, student_id: uuid.UUID, body: SubscriptionUpsert) -> dict:
        result = await self.session.exec(
            select(Subscription).where(Subscription.student_id == student_id)
        )
        subscription = result.first()
        is_new = subscription is None

        plan: Optional[Plan] = None
        if body.plan_id is not None:
            plan = await self.session.get(Plan, body.plan_id)
            if plan is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

        if is_new and plan is None and not body.plan_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A plan_id or plan_name is required to create a subscription",
            )

        plan_changed = plan is not None and (is_new or subscription.plan_id != plan.id)

        if is_new:
            subscription = Subscription(student_id=student_id, plan_name=body.plan_name or "")

        data = body.model_dump(exclude={"plan_id", "plan_name", "sessions_remaining"}, exclude_unset=True)
        was_active = subscription.status == SubscriptionStatus.ACTIVE if not is_new else True
        for field, value in data.items():
            setattr(subscription, field, value)

        # Pausing/resuming: stamp paused_at only on the ACTIVE→PAUSED edge so
        # it reflects when the *current* pause began, not just "last touched".
        if subscription.status == SubscriptionStatus.PAUSED and was_active:
            subscription.paused_at = datetime.utcnow()
        elif subscription.status != SubscriptionStatus.PAUSED:
            subscription.paused_at = None

        if plan is not None:
            subscription.plan_id = plan.id
            subscription.plan_name = plan.name  # keep legacy field in sync
        elif body.plan_name:
            subscription.plan_name = body.plan_name

        if body.sessions_remaining is not None:
            subscription.sessions_remaining = body.sessions_remaining
        elif plan_changed:
            subscription.sessions_remaining = plan.sessions_per_week * DEFAULT_BILLING_WEEKS

        self.session.add(subscription)
        await self.session.commit()
        await self.session.refresh(subscription)
        return await self._to_dict(subscription)

    async def _to_dict(self, sub: Subscription, student_name: Optional[str] = None) -> dict:
        d = sub.model_dump()
        if student_name is not None:
            d["student_name"] = student_name
        if sub.plan_id is not None:
            plan = await self.session.get(Plan, sub.plan_id)
            if plan is not None:
                d["plan"] = plan.model_dump()
        return d

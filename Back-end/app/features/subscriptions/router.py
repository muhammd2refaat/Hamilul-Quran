from typing import Annotated
import uuid
from fastapi import APIRouter, Depends
from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.subscriptions.schemas import (
    SubscriptionGlobalResponse,
    SubscriptionResponse,
    SubscriptionUpsert,
)
from app.features.subscriptions.service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


def _get_svc(session=Depends(get_session)) -> SubscriptionService:
    return SubscriptionService(session=session)


SvcDep = Annotated[SubscriptionService, Depends(_get_svc)]


@router.get("", response_model=list[SubscriptionGlobalResponse], summary="List all subscriptions (ADMIN)")
async def list_subscriptions(_: AdminDep, svc: SvcDep):
    return await svc.get_all()


@router.get("/me", response_model=SubscriptionResponse, summary="Get my subscription")
async def get_my_subscription(current_user: CurrentUserDep, svc: SvcDep):
    return await svc.get_for_student(current_user.id)


@router.put(
    "/{student_id}",
    response_model=SubscriptionResponse,
    summary="Create or update a student's subscription (ADMIN)",
)
async def upsert_subscription(
    student_id: uuid.UUID, body: SubscriptionUpsert, _: AdminDep, svc: SvcDep
):
    return await svc.upsert(student_id, body)

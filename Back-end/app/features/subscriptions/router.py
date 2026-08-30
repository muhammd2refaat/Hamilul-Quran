from typing import Annotated
import uuid
from fastapi import APIRouter, Depends
from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.subscriptions.schemas import (
    PlanCreate,
    PlanResponse,
    PlanUpdate,
    SubscriptionGlobalResponse,
    SubscriptionResponse,
    SubscriptionUpsert,
)
from app.features.subscriptions.service import PlanService, SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])
plans_router = APIRouter(prefix="/plans", tags=["Plans"])


def _get_svc(session=Depends(get_session)) -> SubscriptionService:
    return SubscriptionService(session=session)


def _get_plan_svc(session=Depends(get_session)) -> PlanService:
    return PlanService(session=session)


SvcDep = Annotated[SubscriptionService, Depends(_get_svc)]
PlanSvcDep = Annotated[PlanService, Depends(_get_plan_svc)]


# ─── Plans ──────────────────────────────────────────────────────────────────

@plans_router.get("", response_model=list[PlanResponse], summary="List plans")
async def list_plans(_: CurrentUserDep, svc: PlanSvcDep, include_inactive: bool = True):
    return await svc.list_all(include_inactive=include_inactive)


@plans_router.post("", response_model=PlanResponse, status_code=201, summary="Create a plan (ADMIN)")
async def create_plan(body: PlanCreate, _: AdminDep, svc: PlanSvcDep):
    return await svc.create(body)


@plans_router.patch("/{plan_id}", response_model=PlanResponse, summary="Update a plan (ADMIN)")
async def update_plan(plan_id: uuid.UUID, body: PlanUpdate, _: AdminDep, svc: PlanSvcDep):
    return await svc.update(plan_id, body)


@plans_router.delete("/{plan_id}", status_code=204, summary="Deactivate a plan (ADMIN)")
async def deactivate_plan(plan_id: uuid.UUID, _: AdminDep, svc: PlanSvcDep):
    await svc.deactivate(plan_id)


# ─── Subscriptions ──────────────────────────────────────────────────────────

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

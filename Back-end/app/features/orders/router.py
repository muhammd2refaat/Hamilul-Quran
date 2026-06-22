import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.orders.models import OrderStatus
from app.features.orders.schemas import (
    OrderCreate, OrderResponse, OrderDetailedResponse, PaginatedOrders
)
from app.features.orders.service import OrderService

router = APIRouter(prefix="/orders")


def _get_svc(session=Depends(get_session)) -> OrderService:
    return OrderService(session=session)


SvcDep = Annotated[OrderService, Depends(_get_svc)]


@router.post(
    "",
    response_model=OrderDetailedResponse,
    status_code=201,
    summary="Create purchasing order request",
)
async def create_order(
    body: OrderCreate,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """Any authenticated user can create a purchasing order request."""
    return await svc.create(body, created_by=current_user.id)


@router.get(
    "",
    response_model=PaginatedOrders,
    summary="List purchasing orders",
)
async def list_orders(
    _: CurrentUserDep,
    svc: SvcDep,
    site_id: Optional[uuid.UUID] = Query(None),
    order_status: Optional[OrderStatus] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    items, total = await svc.get_all(
        limit=limit,
        offset=offset,
        site_id=site_id,
        status_filter=order_status,
    )
    return PaginatedOrders(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/{order_id}",
    response_model=OrderDetailedResponse,
    summary="Get order by ID",
)
async def get_order(
    order_id: uuid.UUID,
    _: CurrentUserDep,
    svc: SvcDep,
):
    return await svc.get_by_id(order_id)


@router.patch(
    "/{order_id}/approve",
    response_model=OrderDetailedResponse,
    summary="Approve purchasing order request (ADMIN)",
)
async def approve_order(
    order_id: uuid.UUID,
    _: AdminDep,
    svc: SvcDep,
):
    """REQUESTED → APPROVED."""
    return await svc.update_status(order_id, OrderStatus.APPROVED)


@router.patch(
    "/{order_id}/reject",
    response_model=OrderDetailedResponse,
    summary="Reject purchasing order request (ADMIN)",
)
async def reject_order(
    order_id: uuid.UUID,
    _: AdminDep,
    svc: SvcDep,
):
    """REQUESTED → REJECTED."""
    return await svc.update_status(order_id, OrderStatus.REJECTED)

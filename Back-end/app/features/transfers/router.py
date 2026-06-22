from typing import Annotated, Optional
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.redis_client import get_redis
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.transfers.models import TransferStatus
from app.features.transfers.schemas import (
    TransferCreate, TransferResponse, PaginatedTransfers,
    TransferStatusUpdate, TransferHistoryResponse,
)
from app.features.transfers.service import TransferService

router = APIRouter(prefix="/transfers")


def _get_svc(
    session=Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
) -> TransferService:
    return TransferService(session=session, redis=redis)


SvcDep = Annotated[TransferService, Depends(_get_svc)]


@router.post(
    "",
    response_model=TransferResponse,
    status_code=201,
    summary="Create transfer request",
)
async def create_transfer(
    body: TransferCreate,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """
    Any authenticated user can create a transfer request.
    - TECHNICIAN / SITE_ACCOUNTABLE: `target_site_id` MUST match their own assigned site.
    - ADMIN: can request any transfer.
    """
    return await svc.create(body, created_by=current_user.id, current_user=current_user)


@router.get(
    "",
    response_model=PaginatedTransfers,
    summary="List transfers (filtered by role)",
)
async def list_transfers(
    current_user: CurrentUserDep,
    svc: SvcDep,
    site_id: Optional[uuid.UUID] = Query(None),
    transfer_status: Optional[TransferStatus] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    - ADMIN: sees all transfers.
    - SITE_ACCOUNTABLE: sees transfers where their site is source or target.
    - TECHNICIAN: sees transfers for their own site only.
    """
    items, total = await svc.get_all(
        limit=limit,
        offset=offset,
        site_id=site_id,
        status_filter=transfer_status,
        current_user=current_user,
    )
    return PaginatedTransfers(items=items, total=total, limit=limit, offset=offset)


@router.get(
    "/{transfer_id}",
    response_model=TransferResponse,
    summary="Get transfer by ID (includes full history)",
)
async def get_transfer(
    transfer_id: uuid.UUID,
    _: CurrentUserDep,
    svc: SvcDep,
):
    return await svc.get_by_id(transfer_id)


@router.get(
    "/{transfer_id}/history",
    response_model=list[TransferHistoryResponse],
    summary="Get full state-change history for a transfer",
)
async def get_transfer_history(
    transfer_id: uuid.UUID,
    _: CurrentUserDep,
    svc: SvcDep,
):
    """Returns every state transition recorded for this transfer, in chronological order."""
    return await svc.get_history(transfer_id)


@router.patch(
    "/{transfer_id}/approve",
    response_model=TransferResponse,
    summary="Approve transfer (ADMIN or SOURCE site's SITE_ACCOUNTABLE)",
)
async def approve_transfer(
    transfer_id: uuid.UUID,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """
    REQUESTED → APPROVED.
    Allowed: ADMIN or the accountable user of the SOURCE site (the site giving the items).
    Atomically locks and decrements source site stock.
    """
    return await svc.approve(transfer_id, current_user)


@router.patch(
    "/{transfer_id}/transit",
    response_model=TransferResponse,
    summary="Mark transfer as IN_TRANSIT (ADMIN or SOURCE site's SITE_ACCOUNTABLE)",
)
async def mark_transit(
    transfer_id: uuid.UUID,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """APPROVED → IN_TRANSIT. Source site confirms the goods have been dispatched. No stock movement."""
    return await svc.mark_in_transit(transfer_id, current_user)


@router.patch(
    "/{transfer_id}/receive",
    response_model=TransferResponse,
    summary="Confirm receipt — ADMIN, TARGET site's SITE_ACCOUNTABLE, or TECHNICIAN at target site",
)
async def receive_transfer(
    transfer_id: uuid.UUID,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """
    IN_TRANSIT → RECEIVED.
    Atomically increments target site stock.
    Allowed by: ADMIN, the TARGET site's SITE_ACCOUNTABLE, or a TECHNICIAN assigned to the target site.
    """
    return await svc.receive(transfer_id, current_user)


@router.patch(
    "/{transfer_id}/cancel",
    response_model=TransferResponse,
    summary="Cancel transfer with optional stock rollback",
)
async def cancel_transfer(
    transfer_id: uuid.UUID,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """
    Any state → CANCELLED (with restrictions):
    - ADMIN can cancel from any state.
    - Creator can cancel only REQUESTED transfers.
    - If APPROVED or IN_TRANSIT, source stock is rolled back atomically.
    """
    return await svc.cancel(transfer_id, current_user)

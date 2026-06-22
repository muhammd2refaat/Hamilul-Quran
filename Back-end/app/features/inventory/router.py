from typing import Annotated, Optional
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.core.database import get_session
from app.core.redis_client import get_redis
from app.core.dependencies import AdminDep, AdminOrProcurementDep, CurrentUserDep
from app.core.dependencies import verify_site_access
from app.features.inventory.models import MainCategory, SubCategory
from app.features.inventory.schemas import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse, PaginatedInventoryItems,
    StockCreate, StockUpdate, StockResponse, PaginatedStock,
)
from app.features.inventory.service import InventoryService
from app.features.users.models import UserRole

router = APIRouter(prefix="/inventory")


def _get_svc(
    session=Depends(get_session),
    redis: aioredis.Redis = Depends(get_redis),
) -> InventoryService:
    return InventoryService(session=session, redis=redis)


SvcDep = Annotated[InventoryService, Depends(_get_svc)]


# ─── Items ───────────────────────────────────────────────────────────────────

@router.get(
    "/items",
    response_model=PaginatedInventoryItems,
    summary="List inventory items with search & pagination",
)
async def list_items(
    _: CurrentUserDep,
    svc: SvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Search name or model number"),
    main_category: Optional[MainCategory] = Query(None),
    sub_category: Optional[SubCategory] = Query(None),
):
    items, total = await svc.get_items(
        limit=limit, offset=offset, search=search, main_category=main_category, sub_category=sub_category
    )
    return PaginatedInventoryItems(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/items",
    response_model=InventoryItemResponse,
    status_code=201,
    summary="Create inventory item (ADMIN or PROCUREMENT)",
)
async def create_item(_: AdminOrProcurementDep, svc: SvcDep, body: InventoryItemCreate):
    return await svc.create_item(body)


@router.get(
    "/items/{item_id}",
    response_model=InventoryItemResponse,
    summary="Get inventory item by ID",
)
async def get_item(item_id: uuid.UUID, _: CurrentUserDep, svc: SvcDep):
    return await svc.get_item_by_id(item_id)


@router.patch(
    "/items/{item_id}",
    response_model=InventoryItemResponse,
    summary="Update inventory item (ADMIN or PROCUREMENT)",
)
async def update_item(
    item_id: uuid.UUID, body: InventoryItemUpdate, _: AdminOrProcurementDep, svc: SvcDep
):
    return await svc.update_item(item_id, body)


# ─── Stock ───────────────────────────────────────────────────────────────────

@router.get(
    "/stock",
    response_model=PaginatedStock,
    summary="List stock levels (SITE_ACCOUNTABLE filtered to own site)",
)
async def list_stock(
    current_user: CurrentUserDep,
    svc: SvcDep,
    site_id: Optional[uuid.UUID] = Query(None),
    item_id: Optional[uuid.UUID] = Query(None),
    below_threshold_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session=Depends(get_session),
):
    # SITE_ACCOUNTABLE must filter to their own site
    if current_user.role == UserRole.SITE_ACCOUNTABLE:
        if site_id is None:
            # Auto-inject their site — find it
            from app.features.sites.models import Site
            from sqlmodel import select
            result = await session.exec(
                select(Site).where(Site.accountable_user_id == current_user.id)
            )
            site = result.first()
            if site:
                site_id = site.id
        else:
            await verify_site_access(site_id, current_user, session)

    items, total = await svc.get_stock(
        site_id=site_id,
        item_id=item_id,
        limit=limit,
        offset=offset,
        below_threshold_only=below_threshold_only,
    )
    return PaginatedStock(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/stock",
    response_model=StockResponse,
    status_code=201,
    summary="Create stock entry (ADMIN or SITE_ACCOUNTABLE for own site)",
)
async def create_stock(
    body: StockCreate,
    current_user: CurrentUserDep,
    svc: SvcDep,
    session=Depends(get_session),
):
    await verify_site_access(body.site_id, current_user, session, require_write=True)
    stock = await svc.create_stock(body)
    resp = StockResponse.model_validate(stock)
    resp.is_below_threshold = stock.quantity_available < stock.min_safety_threshold
    return resp


@router.patch(
    "/stock/{site_id}/{item_id}",
    response_model=StockResponse,
    summary="Update stock entry (ADMIN or SITE_ACCOUNTABLE for own site)",
)
async def update_stock(
    site_id: uuid.UUID,
    item_id: uuid.UUID,
    body: StockUpdate,
    current_user: CurrentUserDep,
    svc: SvcDep,
    session=Depends(get_session),
):
    await verify_site_access(site_id, current_user, session, require_write=True)
    return await svc.update_stock(site_id, item_id, body)

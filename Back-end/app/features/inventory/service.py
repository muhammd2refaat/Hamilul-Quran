import json
import uuid
from typing import Optional

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy import func, or_, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.redis_client import RedisChannels
from app.features.inventory.models import InventoryItem, InventoryStock, MainCategory, SubCategory
from app.features.inventory.schemas import (
    InventoryItemCreate,
    InventoryItemUpdate,
    StockCreate,
    StockUpdate,
    StockResponse,
)


class InventoryService:
    def __init__(self, session: AsyncSession, redis: aioredis.Redis):
        self.session = session
        self.redis = redis

    # ─── InventoryItem CRUD ────────────────────────────────────────────────

    async def get_items(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        main_category: Optional[MainCategory] = None,
        sub_category: Optional[SubCategory] = None,
    ) -> tuple[list[InventoryItem], int]:
        query = select(InventoryItem)
        count_query = select(func.count()).select_from(InventoryItem)

        if search:
            like = f"%{search}%"
            cond = or_(
                InventoryItem.name.ilike(like),
                InventoryItem.model_number.ilike(like),
            )
            query = query.where(cond)
            count_query = count_query.where(cond)

        if main_category:
            query = query.where(InventoryItem.main_category == main_category)
            count_query = count_query.where(InventoryItem.main_category == main_category)

        if sub_category:
            query = query.where(InventoryItem.sub_category == sub_category)
            count_query = count_query.where(InventoryItem.sub_category == sub_category)

        total = (await self.session.exec(count_query)).one()
        result = await self.session.exec(
            query.order_by(InventoryItem.name).limit(limit).offset(offset)
        )
        return result.all(), total

    async def get_item_by_id(self, item_id: uuid.UUID) -> InventoryItem:
        result = await self.session.exec(
            select(InventoryItem).where(InventoryItem.id == item_id)
        )
        item = result.first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found"
            )
        return item

    async def create_item(self, data: InventoryItemCreate) -> InventoryItem:
        item = InventoryItem(**data.model_dump())
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def update_item(self, item_id: uuid.UUID, data: InventoryItemUpdate) -> InventoryItem:
        item = await self.get_item_by_id(item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        self.session.add(item)
        await self.session.commit()
        await self.session.refresh(item)
        return item

    # ─── InventoryStock CRUD ───────────────────────────────────────────────

    async def get_stock(
        self,
        site_id: Optional[uuid.UUID] = None,
        item_id: Optional[uuid.UUID] = None,
        limit: int = 50,
        offset: int = 0,
        below_threshold_only: bool = False,
    ) -> tuple[list[StockResponse], int]:
        query = select(InventoryStock)
        count_query = select(func.count()).select_from(InventoryStock)

        if site_id:
            query = query.where(InventoryStock.site_id == site_id)
            count_query = count_query.where(InventoryStock.site_id == site_id)

        if item_id:
            query = query.where(InventoryStock.item_id == item_id)
            count_query = count_query.where(InventoryStock.item_id == item_id)

        if below_threshold_only:
            below = InventoryStock.quantity_available < InventoryStock.min_safety_threshold
            query = query.where(below)
            count_query = count_query.where(below)

        total = (await self.session.exec(count_query)).one()
        stock_rows = (await self.session.exec(query.limit(limit).offset(offset))).all()

        results = []
        for row in stock_rows:
            resp = StockResponse.model_validate(row)
            resp.is_below_threshold = row.quantity_available < row.min_safety_threshold
            results.append(resp)

        return results, total

    async def get_stock_entry(self, site_id: uuid.UUID, item_id: uuid.UUID) -> InventoryStock:
        result = await self.session.exec(
            select(InventoryStock).where(
                InventoryStock.site_id == site_id,
                InventoryStock.item_id == item_id,
            )
        )
        stock = result.first()
        if not stock:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No stock record for site={site_id}, item={item_id}",
            )
        return stock

    async def create_stock(self, data: StockCreate) -> InventoryStock:
        # Check for duplicate
        existing = await self.session.exec(
            select(InventoryStock).where(
                InventoryStock.site_id == data.site_id,
                InventoryStock.item_id == data.item_id,
            )
        )
        if existing.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stock record already exists for this site/item combination",
            )
        stock = InventoryStock(**data.model_dump())
        self.session.add(stock)
        await self.session.commit()
        await self.session.refresh(stock)
        return stock

    async def update_stock(
        self, site_id: uuid.UUID, item_id: uuid.UUID, data: StockUpdate
    ) -> StockResponse:
        stock = await self.get_stock_entry(site_id, item_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(stock, field, value)
        self.session.add(stock)
        await self.session.commit()
        await self.session.refresh(stock)

        # ── Low-stock alert pub/sub ────────────────────────────────────────
        if stock.quantity_available < stock.min_safety_threshold:
            await self.redis.publish(
                RedisChannels.LOW_STOCK_ALERT,
                json.dumps({
                    "site_id": str(site_id),
                    "item_id": str(item_id),
                    "quantity_available": stock.quantity_available,
                    "min_safety_threshold": stock.min_safety_threshold,
                }),
            )

        resp = StockResponse.model_validate(stock)
        resp.is_below_threshold = stock.quantity_available < stock.min_safety_threshold
        return resp

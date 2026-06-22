import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.features.orders.models import Order, OrderStatus
from app.features.orders.schemas import OrderCreate


class OrderService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: OrderCreate, created_by: uuid.UUID) -> Order:
        order = Order(
            item_name=data.item_name,
            description=data.description,
            price=data.price,
            supplier_id=data.supplier_id,
            site_id=data.site_id,
            created_by_id=created_by,
            status=OrderStatus.REQUESTED,
        )
        self.session.add(order)
        await self.session.commit()
        return await self.get_by_id(order.id)

    async def get_all(
        self,
        limit: int = 20,
        offset: int = 0,
        site_id: Optional[uuid.UUID] = None,
        status_filter: Optional[OrderStatus] = None,
    ) -> Tuple[list[Order], int]:
        query = select(Order).options(selectinload(Order.site), selectinload(Order.created_by))
        count_query = select(func.count(Order.id))

        if site_id:
            query = query.where(Order.site_id == site_id)
            count_query = count_query.where(Order.site_id == site_id)

        if status_filter:
            query = query.where(Order.status == status_filter)
            count_query = count_query.where(Order.status == status_filter)

        query = query.order_by(Order.created_at.desc()).offset(offset).limit(limit)

        total_result = await self.session.exec(count_query)
        total = total_result.one()

        items_result = await self.session.exec(query)
        items = items_result.all()

        return list(items), total

    async def get_by_id(self, order_id: uuid.UUID) -> Order:
        query = select(Order).options(selectinload(Order.site), selectinload(Order.created_by)).where(Order.id == order_id)
        result = await self.session.exec(query)
        order = result.first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        return order

    async def update_status(self, order_id: uuid.UUID, new_status: OrderStatus) -> Order:
        order = await self.get_by_id(order_id)
        
        # Simple state machine validation
        if order.status != OrderStatus.REQUESTED and new_status in (OrderStatus.APPROVED, OrderStatus.REJECTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition order from {order.status} to {new_status}"
            )
            
        order.status = new_status
        self.session.add(order)
        await self.session.commit()
        return await self.get_by_id(order.id)

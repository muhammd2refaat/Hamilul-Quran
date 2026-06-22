import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.features.orders.models import OrderStatus


class OrderCreate(BaseModel):
    item_name: str
    price: float
    description: Optional[str] = None
    supplier_id: Optional[uuid.UUID] = None
    site_id: uuid.UUID


class OrderResponse(BaseModel):
    id: uuid.UUID
    item_name: str
    price: float
    description: Optional[str] = None
    status: OrderStatus
    supplier_id: Optional[uuid.UUID] = None
    site_id: uuid.UUID
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderSiteNested(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class OrderUserNested(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    model_config = {"from_attributes": True}


class OrderDetailedResponse(OrderResponse):
    site: Optional[OrderSiteNested] = None
    created_by: Optional[OrderUserNested] = None

    model_config = {"from_attributes": True}


class PaginatedOrders(BaseModel):
    items: list[OrderDetailedResponse]
    total: int
    limit: int
    offset: int

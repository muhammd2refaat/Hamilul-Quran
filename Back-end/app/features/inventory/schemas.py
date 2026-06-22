import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.features.inventory.models import MainCategory, SubCategory


# ─── InventoryItem Schemas ────────────────────────────────────────────────────

class InventoryItemCreate(BaseModel):
    name: str
    main_category: MainCategory
    sub_category: SubCategory
    model_number: str
    supplier_id: uuid.UUID


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    main_category: Optional[MainCategory] = None
    sub_category: Optional[SubCategory] = None
    model_number: Optional[str] = None
    supplier_id: Optional[uuid.UUID] = None


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    main_category: MainCategory
    sub_category: SubCategory
    model_number: str
    supplier_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedInventoryItems(BaseModel):
    items: list[InventoryItemResponse]
    total: int
    limit: int
    offset: int


# ─── InventoryStock Schemas ───────────────────────────────────────────────────

class StockCreate(BaseModel):
    site_id: uuid.UUID
    item_id: uuid.UUID
    quantity_available: int = 0
    quantity_faulty: int = 0
    min_safety_threshold: int = 0


class StockUpdate(BaseModel):
    quantity_available: Optional[int] = None
    quantity_faulty: Optional[int] = None
    min_safety_threshold: Optional[int] = None


class StockResponse(BaseModel):
    site_id: uuid.UUID
    item_id: uuid.UUID
    quantity_available: int
    quantity_faulty: int
    min_safety_threshold: int
    updated_at: datetime
    # Computed field
    is_below_threshold: bool = False

    model_config = {"from_attributes": True}


class PaginatedStock(BaseModel):
    items: list[StockResponse]
    total: int
    limit: int
    offset: int

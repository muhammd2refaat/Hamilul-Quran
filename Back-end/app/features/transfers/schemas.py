import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.features.transfers.models import TransferStatus


# ─── Request Schemas ──────────────────────────────────────────────────────────

class TransferCreate(BaseModel):
    source_site_id: uuid.UUID
    target_site_id: uuid.UUID
    item_id: uuid.UUID
    quantity: int
    notes: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v

    @field_validator("target_site_id")
    @classmethod
    def sites_differ(cls, v: uuid.UUID, info) -> uuid.UUID:
        if "source_site_id" in info.data and v == info.data["source_site_id"]:
            raise ValueError("Source and target sites must be different")
        return v


class TransferStatusUpdate(BaseModel):
    notes: Optional[str] = None


# ─── Nested Schemas (for enriched responses) ──────────────────────────────────

class NestedSite(BaseModel):
    id: uuid.UUID
    name: str
    model_config = {"from_attributes": True}


class NestedItem(BaseModel):
    id: uuid.UUID
    name: str
    main_category: str
    sub_category: str
    model_config = {"from_attributes": True}


class NestedUser(BaseModel):
    id: uuid.UUID
    email: str
    role: str
    model_config = {"from_attributes": True}


# ─── History Schema ───────────────────────────────────────────────────────────

class TransferHistoryResponse(BaseModel):
    id: uuid.UUID
    transfer_id: uuid.UUID
    from_status: Optional[TransferStatus] = None
    to_status: TransferStatus
    changed_by_id: uuid.UUID
    note: Optional[str] = None
    changed_at: datetime

    model_config = {"from_attributes": True}


# ─── Response Schemas ─────────────────────────────────────────────────────────

class TransferResponse(BaseModel):
    id: uuid.UUID
    source_site_id: uuid.UUID
    target_site_id: uuid.UUID
    item_id: uuid.UUID
    quantity: int
    status: TransferStatus
    created_by: uuid.UUID
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Enriched nested info
    source_site: Optional[NestedSite] = None
    target_site: Optional[NestedSite] = None
    item: Optional[NestedItem] = None
    requester: Optional[NestedUser] = None
    history: list[TransferHistoryResponse] = []

    model_config = {"from_attributes": True}


class PaginatedTransfers(BaseModel):
    items: list[TransferResponse]
    total: int
    limit: int
    offset: int

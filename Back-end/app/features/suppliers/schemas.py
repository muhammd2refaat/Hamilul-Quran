import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ─── Request Schemas ──────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str


class SupplierUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


# ─── Response Schemas ─────────────────────────────────────────────────────────

class SupplierResponse(BaseModel):
    id: uuid.UUID
    company_name: str
    contact_name: str
    email: str
    phone: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedSuppliers(BaseModel):
    items: list[SupplierResponse]
    total: int
    limit: int
    offset: int

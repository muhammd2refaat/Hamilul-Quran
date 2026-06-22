import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ─── Request Schemas ──────────────────────────────────────────────────────────

class SiteCreate(BaseModel):
    name: str
    location: str
    accountable_user_id: Optional[uuid.UUID] = None


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    accountable_user_id: Optional[uuid.UUID] = None


# ─── Response Schemas ─────────────────────────────────────────────────────────

class SiteResponse(BaseModel):
    id: uuid.UUID
    name: str
    location: str
    accountable_user_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedSites(BaseModel):
    items: list[SiteResponse]
    total: int
    limit: int
    offset: int

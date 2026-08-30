from __future__ import annotations
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from app.features.subscriptions.models import SubscriptionStatus


# ─── Plans ──────────────────────────────────────────────────────────────────

class PlanCreate(BaseModel):
    name: str
    sessions_per_week: int
    session_duration_minutes: int
    price: Decimal
    currency: str = "EGP"


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    sessions_per_week: Optional[int] = None
    session_duration_minutes: Optional[int] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    sessions_per_week: int
    session_duration_minutes: int
    price: Decimal
    currency: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Subscriptions ──────────────────────────────────────────────────────────

class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    plan_id: Optional[uuid.UUID] = None
    plan_name: str
    status: SubscriptionStatus
    start_date: date
    notes: Optional[str] = None
    sessions_remaining: Optional[int] = None
    paused_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # Full plan detail (sessions/week, duration, price) when plan_id is set —
    # avoids a second round-trip to /plans just to show what the number means.
    plan: Optional[PlanResponse] = None

    model_config = {"from_attributes": True}


class SubscriptionGlobalResponse(SubscriptionResponse):
    """Admin view — includes the student's resolved display name."""
    student_name: str


class SubscriptionUpsert(BaseModel):
    # Preferred: link a real Plan (auto-fills plan_name + resets
    # sessions_remaining, unless sessions_remaining is also given explicitly
    # below). plan_name is still accepted alone for the legacy free-text path.
    plan_id: Optional[uuid.UUID] = None
    plan_name: Optional[str] = None
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    start_date: date
    notes: Optional[str] = None
    # Explicit admin override — extend (add sessions back) or otherwise
    # adjust the count directly. Always wins over the plan's default reset.
    sessions_remaining: Optional[int] = None

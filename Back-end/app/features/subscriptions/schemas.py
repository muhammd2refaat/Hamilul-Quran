from __future__ import annotations
import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.features.subscriptions.models import SubscriptionStatus


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    plan_name: str
    status: SubscriptionStatus
    start_date: date
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionGlobalResponse(SubscriptionResponse):
    """Admin view — includes the student's resolved display name."""
    student_name: str


class SubscriptionUpsert(BaseModel):
    plan_name: str
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    start_date: date
    notes: Optional[str] = None

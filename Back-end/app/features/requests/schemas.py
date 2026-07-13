from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.features.requests.models import (
    RequestStatus,
    RequestFromRole,
    RequestType,
)


class RequestResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    from_role: RequestFromRole
    type: RequestType
    details: str
    current_day: Optional[str] = None
    current_time: Optional[str] = None
    requested_day: Optional[str] = None
    requested_time: Optional[str] = None
    requested_plan: Optional[str] = None
    requested_teacher: Optional[str] = None
    admin_note: Optional[str] = None
    status: RequestStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RequestGlobalResponse(RequestResponse):
    """Admin view — includes the requester's resolved display name."""
    from_name: str


class RequestCreate(BaseModel):
    type: RequestType
    from_role: RequestFromRole
    details: str
    current_day: Optional[str] = None
    current_time: Optional[str] = None
    requested_day: Optional[str] = None
    requested_time: Optional[str] = None
    requested_plan: Optional[str] = None
    requested_teacher: Optional[str] = None


class RequestStatusUpdate(BaseModel):
    status: RequestStatus
    admin_note: Optional[str] = None

from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from sqlmodel import SQLModel, Field, Column, JSON


class RequestStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class RequestFromRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    GUARDIAN = "guardian"
    # Anonymous visitor submitting the public landing-page "Free trial" form
    # — no account exists yet, see guest_name/guest_email/guest_phone below.
    GUEST = "guest"


class RequestType(str, Enum):
    RESCHEDULE = "reschedule"
    NEW_ENROLLMENT = "new_enrollment"
    CHANGE_TEACHER = "change_teacher"
    PAUSE = "pause"
    OTHER = "other"


class PlatformRequest(SQLModel, table=True):
    __tablename__ = "requests"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # The account that filed the request. Null for a GUEST submission (the
    # public landing-page trial form) — no account exists at submit time,
    # see guest_name/guest_email/guest_phone below instead.
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)

    from_role: RequestFromRole
    type: RequestType

    details: str

    # Guest contact info (GUEST requests only — public trial form has no
    # authenticated user to pull this from).
    guest_name: Optional[str] = Field(default=None, max_length=200)
    guest_email: Optional[str] = Field(default=None, max_length=255)
    guest_phone: Optional[str] = Field(default=None, max_length=30)

    # Reschedule-specific (free text so the UI can show "Tuesday 10:00 AM").
    current_day: Optional[str] = Field(default=None, max_length=50)
    current_time: Optional[str] = Field(default=None, max_length=50)
    requested_day: Optional[str] = Field(default=None, max_length=50)
    requested_time: Optional[str] = Field(default=None, max_length=50)

    # Enrollment / change-teacher specific.
    requested_plan: Optional[str] = Field(default=None, max_length=255)
    requested_teacher: Optional[str] = Field(default=None, max_length=255)

    # Structured plan-request picks (PlanRequestModal — sessions/week,
    # duration, day/time slots), same shape as Allocation.schedule. Kept
    # alongside `details`/`requested_plan` (still the human-readable summary
    # admins see) so the request can be reliably read back and pre-filled
    # when a student edits it, rather than re-parsing formatted text.
    requested_sessions_per_week: Optional[int] = Field(default=None)
    requested_duration: Optional[int] = Field(default=None)
    requested_schedule: Optional[List[Dict[str, Any]]] = Field(
        default=None, sa_column=Column(JSON)
    )

    admin_note: Optional[str] = Field(default=None)

    status: RequestStatus = Field(default=RequestStatus.PENDING)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)

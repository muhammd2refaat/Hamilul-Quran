from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field


class RequestStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class RequestFromRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    GUARDIAN = "guardian"


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
    # The account that filed the request.
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    from_role: RequestFromRole
    type: RequestType

    details: str

    # Reschedule-specific (free text so the UI can show "Tuesday 10:00 AM").
    current_day: Optional[str] = Field(default=None, max_length=50)
    current_time: Optional[str] = Field(default=None, max_length=50)
    requested_day: Optional[str] = Field(default=None, max_length=50)
    requested_time: Optional[str] = Field(default=None, max_length=50)

    # Enrollment / change-teacher specific.
    requested_plan: Optional[str] = Field(default=None, max_length=255)
    requested_teacher: Optional[str] = Field(default=None, max_length=255)

    admin_note: Optional[str] = Field(default=None)

    status: RequestStatus = Field(default=RequestStatus.PENDING)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)

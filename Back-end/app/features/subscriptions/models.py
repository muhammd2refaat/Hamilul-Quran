from __future__ import annotations
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    WITHDRAWN = "withdrawn"


class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # One subscription per student.
    student_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)

    plan_name: str = Field(max_length=255)
    status: SubscriptionStatus = Field(default=SubscriptionStatus.ACTIVE)
    start_date: date = Field(default_factory=date.today)
    notes: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

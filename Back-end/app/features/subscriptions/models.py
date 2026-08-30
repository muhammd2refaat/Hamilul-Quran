from __future__ import annotations
import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from sqlalchemy import Column, Numeric
from sqlmodel import SQLModel, Field


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    WITHDRAWN = "withdrawn"


class Plan(SQLModel, table=True):
    """A subscription plan admins can offer — e.g. "2 sessions/week — 30 min".
    Region-agnostic today (currency defaults to EGP, the only market priced
    so far); a future regional-pricing feature would key off this same table
    rather than replacing it.
    """
    __tablename__ = "plans"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    name: str = Field(max_length=200)
    sessions_per_week: int = Field(ge=1)
    session_duration_minutes: int = Field(ge=1)
    price: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    currency: str = Field(default="EGP", max_length=8)
    # Soft-disable rather than hard delete — existing subscriptions may still
    # reference a plan an admin no longer wants to offer to new students.
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


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

    # Preferred path going forward — a real Plan row. Nullable for backward
    # compatibility with subscriptions created before Plan existed (free-text
    # plan_name only). plan_name is kept in sync with plan.name by the
    # service layer whenever plan_id is set, so anything still reading
    # plan_name directly (e.g. the Frontend's plan page) keeps working
    # unmodified.
    plan_id: Optional[uuid.UUID] = Field(default=None, foreign_key="plans.id", index=True)
    plan_name: str = Field(max_length=255)
    status: SubscriptionStatus = Field(default=SubscriptionStatus.ACTIVE)
    start_date: date = Field(default_factory=date.today)
    notes: Optional[str] = Field(default=None)

    # Sessions left in the current cycle. Set from plan.sessions_per_week ×
    # DEFAULT_BILLING_WEEKS (service.py) whenever a plan is newly assigned or
    # changed; decremented by one each time the student's own attendance is
    # recorded (sessions/service.py::record_attendance). An admin can also
    # set this directly to extend (add sessions back, e.g. a missed session
    # excused) or otherwise adjust it — that manual override always wins.
    # Null for legacy free-text-only subscriptions with no linked plan.
    sessions_remaining: Optional[int] = Field(default=None)
    # When the subscription was last paused — freezes sessions_remaining
    # (no decrement happens while status == PAUSED) and lets the UI show
    # "paused since <date>, N sessions still waiting" rather than a bare
    # status badge.
    paused_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SignupPoint(BaseModel):
    month: str  # "YYYY-MM"
    count: int


class RecentSignup(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    created_at: datetime


class DashboardMetrics(BaseModel):
    total_users: int
    total_students: int
    total_teachers: int
    total_admins: int

    users_by_status: dict[str, int]
    complaints_by_status: dict[str, int]

    total_allocations: int
    total_countries: int

    signups_by_month: list[SignupPoint]
    recent_signups: list[RecentSignup]

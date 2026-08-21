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


class ScorePoint(BaseModel):
    month: str  # "YYYY-MM"
    avg_pct: float
    count: int


class TeacherScoreboardItem(BaseModel):
    teacher_id: uuid.UUID
    teacher_name: str
    avg_pct: float
    session_count: int


class AttendancePoint(BaseModel):
    week: str  # "YYYY-MM-DD", the Monday the week starts on
    rate_pct: float


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

    # Session scores — SessionScore rows within the requested `months` window.
    avg_session_score_pct: Optional[float] = None
    score_trend_by_month: list[ScorePoint] = []
    top_teachers_by_score: list[TeacherScoreboardItem] = []

    # Attendance — SessionAttendance click-tracking, last 30 days.
    attendance_both_joined_rate_pct: Optional[float] = None
    attendance_trend_by_week: list[AttendancePoint] = []

    # Subscriptions — categorical only, see DashboardService for why there's
    # no revenue figure here.
    subscriptions_by_status: dict[str, int] = {}
    subscriptions_by_plan: dict[str, int] = {}

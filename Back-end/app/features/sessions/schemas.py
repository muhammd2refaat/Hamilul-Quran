from __future__ import annotations
import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.features.sessions.models import AttendeeRole

class TeacherHistoryResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    reason: Optional[str] = None

    model_config = {"from_attributes": True}


class SessionScoreResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    date: datetime
    score: int
    max_score: int
    surah: Optional[str] = None
    teacher_comment: Optional[str] = None
    notes: Optional[str] = None
    recitation_type: Optional[str] = None

    model_config = {"from_attributes": True}


class SessionScoreCreate(BaseModel):
    student_id: uuid.UUID
    # teacher_id is inferred from the current user for TEACHER callers;
    # ADMIN callers must supply it explicitly.
    teacher_id: Optional[uuid.UUID] = None
    score: int
    max_score: int = 20
    surah: Optional[str] = None
    teacher_comment: Optional[str] = None
    notes: Optional[str] = None
    recitation_type: Optional[str] = None


# ─── Attendance (Join-button click tracking) ───────────────────────────────────

class AttendanceRecordCreate(BaseModel):
    allocation_id: uuid.UUID
    session_date: date
    scheduled_day: str
    scheduled_time: str


class AttendanceResponse(BaseModel):
    id: uuid.UUID
    allocation_id: uuid.UUID
    user_id: uuid.UUID
    role: AttendeeRole
    session_date: date
    scheduled_day: str
    scheduled_time: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class AttendanceSummaryItem(BaseModel):
    """One counterpart (the other person in an allocation) and how many
    distinct sessions the asking user has attended with them."""
    allocation_id: uuid.UUID
    counterpart_id: uuid.UUID
    counterpart_name: str
    session_count: int


class AttendanceSummaryResponse(BaseModel):
    total_sessions: int
    by_counterpart: list[AttendanceSummaryItem]


class AdminAttendanceItem(BaseModel):
    """One row per (allocation, session_date) occurrence — student and
    teacher attendance shown side by side, so an admin can see at a glance
    whether a session actually had both parties, just one, or neither."""
    allocation_id: uuid.UUID
    session_date: date
    scheduled_day: str
    scheduled_time: str
    student_id: uuid.UUID
    student_name: str
    student_joined_at: Optional[datetime] = None
    teacher_id: uuid.UUID
    teacher_name: str
    teacher_joined_at: Optional[datetime] = None

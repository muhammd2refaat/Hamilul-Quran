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
    # both | teacher_only | student_only | missed | excused | confirmed |
    # not_scheduled once the lesson has ended and been finalized; "pending"
    # while it's still in progress (or awaiting the next finalization pass).
    status: str = "pending"
    outcome_id: Optional[uuid.UUID] = None
    # What finalization did to the student's sessions: +1 deducted
    # (student no-show), -1 refunded (teacher no-show), 0 nothing.
    session_charge: int = 0
    note: Optional[str] = None


class ExcuseRequest(BaseModel):
    note: Optional[str] = None


class JoinResponse(BaseModel):
    """Result of opening a lesson through the tracked /join link."""
    recorded: bool
    meet_link: Optional[str] = None
    # When the lesson isn't open yet / no slot today: why, for the page to show.
    reason: Optional[str] = None


class ConfirmRequest(BaseModel):
    note: Optional[str] = None


# ─── Monthly history ───────────────────────────────────────────────────────────

class HistoryCounts(BaseModel):
    """How a person's lessons in the month went. scheduled = every lesson
    that was (or still is) on the calendar: done + no-shows + missed +
    excused + upcoming. Lessons after the last paid one (not_scheduled)
    aren't part of it."""
    id: uuid.UUID
    name: str
    scheduled: int
    done: int
    student_no_show: int
    teacher_no_show: int
    missed: int
    excused: int
    upcoming: int
    not_scheduled: int


class TeacherHistory(HistoryCounts):
    # Lessons the teacher is credited for: done + student no-shows.
    credited: int


class StudentHistory(HistoryCounts):
    plan_name: Optional[str] = None
    sessions_per_week: Optional[int] = None
    sessions_remaining: Optional[int] = None
    ends_on: Optional[date] = None


class HistoryLesson(BaseModel):
    session_date: date
    scheduled_time: str
    teacher_id: Optional[uuid.UUID] = None
    teacher_name: str
    student_id: Optional[uuid.UUID] = None
    student_name: str
    # An outcome status, or "upcoming".
    status: str
    outcome_id: Optional[uuid.UUID] = None
    note: Optional[str] = None


class MonthlyHistoryResponse(BaseModel):
    month: str  # "YYYY-MM"
    teachers: list[TeacherHistory]
    students: list[StudentHistory]
    lessons: list[HistoryLesson]

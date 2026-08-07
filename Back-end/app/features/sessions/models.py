from __future__ import annotations
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, UniqueConstraint

class TeacherHistory(SQLModel, table=True):
    __tablename__ = "teacher_history"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    teacher_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    unassigned_at: Optional[datetime] = Field(default=None)
    reason: Optional[str] = Field(default=None)


class SessionScore(SQLModel, table=True):
    __tablename__ = "session_scores"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    teacher_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    date: datetime = Field(default_factory=datetime.utcnow)
    # score is relative to max_score (e.g. 17/20), not a fixed 0-100 scale.
    score: int = Field(ge=0)
    max_score: int = Field(default=20, ge=1)
    surah: Optional[str] = Field(default=None, max_length=200)
    teacher_comment: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    recitation_type: Optional[str] = Field(default=None, max_length=100)


class AttendeeRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"


class SessionAttendance(SQLModel, table=True):
    """One row per person per weekly-schedule occurrence they clicked
    "Join" for — recorded client-side the moment the Join link is opened
    (Frontend/lib/dashboard/calendarUtils.ts gates *when* that's clickable;
    this table records *that* it was clicked). Not proof of actual meeting
    attendance — Google's real attendance reporting needs a Workspace
    domain, which personal-Gmail teacher/student OAuth accounts don't have
    access to — but it's the best signal this platform can capture.

    One record per (allocation, user, session_date): a student mashing
    Join five times in the same session doesn't inflate their count.
    """
    __tablename__ = "session_attendance"
    __table_args__ = (
        UniqueConstraint("allocation_id", "user_id", "session_date", name="uq_attendance_slot"),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    allocation_id: uuid.UUID = Field(foreign_key="allocations.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    role: AttendeeRole

    # Which specific weekly occurrence this is — Cairo-local date, matching
    # how the schedule itself is interpreted (see Back-end's
    # google_calendar_client.py CAIRO_TZ note).
    session_date: date
    scheduled_day: str = Field(max_length=10)
    scheduled_time: str = Field(max_length=20)

    joined_at: datetime = Field(default_factory=datetime.utcnow)

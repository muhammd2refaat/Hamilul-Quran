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

    # Whether this Join click actually deducted one session from the
    # student's subscription. Recorded so a teacher no-show can be refunded
    # exactly — never crediting a session that was never taken (e.g. the
    # subscription was already at 0, or had no plan). Always False for
    # teacher rows and for rows recorded before this column existed.
    consumed_session: bool = Field(default=False)


class OutcomeStatus(str, Enum):
    """How a scheduled lesson actually went, decided once it has ended.
    Stored as plain strings (not a Postgres ENUM) — see the enum gotcha in
    eae302777fad_session_attendance.py."""
    BOTH = "both"                  # teacher and student both clicked Join
    TEACHER_ONLY = "teacher_only"  # student no-show
    STUDENT_ONLY = "student_only"  # teacher no-show
    MISSED = "missed"              # nobody clicked Join
    EXCUSED = "excused"            # an admin excused it after the fact


class SessionOutcome(SQLModel, table=True):
    """
    One row per scheduled lesson occurrence once it has ended — including
    lessons nobody joined, so absences are visible instead of silent.

    Written by AttendanceOutcomeService.finalize_due() (a background loop
    plus a lazy pass when an admin opens the attendance log). The unique
    constraint makes finalization idempotent across workers: whoever inserts
    the row first applies the session adjustment; everyone else no-ops.

    session_charge records what finalization did to the student's
    subscription, so an admin excuse can reverse exactly that:
      +1  one session deducted (student no-show rule)
      -1  one session refunded (teacher no-show after the student was
          charged at Join time)
       0  nothing
    """
    __tablename__ = "session_outcomes"
    __table_args__ = (
        UniqueConstraint("allocation_id", "session_date", "scheduled_time", name="uq_session_outcome"),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    allocation_id: uuid.UUID = Field(foreign_key="allocations.id", index=True)
    session_date: date = Field(index=True)
    scheduled_day: str = Field(max_length=10)
    scheduled_time: str = Field(max_length=20)
    status: str = Field(max_length=20)
    session_charge: int = Field(default=0)
    note: Optional[str] = Field(default=None, max_length=500)
    finalized_at: datetime = Field(default_factory=datetime.utcnow)

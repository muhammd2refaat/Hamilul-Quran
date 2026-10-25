from __future__ import annotations
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Index, text
from sqlmodel import SQLModel, Field


class IjazaType(str, Enum):
    HIFZ = "HIFZ"                    # Ijazah in Hifz
    TILAWAH = "TILAWAH"              # Ijazah in Tilawah
    HAFS_AN_ASIM = "HAFS_AN_ASIM"    # Ijazah Hafs ʿan ʿAsim
    TEN_QIRAAT = "TEN_QIRAAT"        # Ijazah in the Ten Qiraʾat
    OTHER = "OTHER"


class TeacherProfile(SQLModel, table=True):
    __tablename__ = "teacher_profiles"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # One profile per teacher user.
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)

    worked_online_before: bool = Field(default=False)
    juz_memorized: Optional[int] = Field(default=None, ge=0, le=30)
    certificate_path: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


class Ijaza(SQLModel, table=True):
    __tablename__ = "ijazas"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # A teacher may hold more than one ijaza — one row per ijaza.
    teacher_profile_id: uuid.UUID = Field(
        foreign_key="teacher_profiles.id", index=True
    )
    ijaza_type: IjazaType = Field(default=IjazaType.OTHER)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReviewKind(str, Enum):
    """Stored as plain strings (not a Postgres ENUM) — see the enum gotcha
    in eae302777fad_session_attendance.py."""
    STUDENT_SESSION = "student_session"  # a student rating one lesson they joined
    ADMIN_AUDIT = "admin_audit"          # an admin's evaluation of the teacher
    GENERAL = "general"                  # legacy: not tied to a lesson or an audit


class TeacherReview(SQLModel, table=True):
    """
    A rating of a teacher. Student reviews are always about one specific
    lesson occurrence (allocation + date + time); admin audits may point at
    a lesson too, but don't have to.

    allocation_id is deliberately NOT a foreign key: deleting or
    re-creating an allocation must not erase the teacher's review history.
    """
    __tablename__ = "teacher_reviews"
    __table_args__ = (
        # One student review per reviewer per lesson; admins may audit freely.
        Index(
            "uq_student_lesson_review",
            "reviewer_id", "allocation_id", "session_date", "scheduled_time",
            unique=True,
            postgresql_where=text("kind = 'student_session'"),
        ),
    )

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    teacher_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    # Nullable: a review may come from an admin acting on behalf of the
    # platform rather than a specific reviewing user account.
    reviewer_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="users.id", nullable=True, index=True
    )
    reviewer_name: str = Field(max_length=200)
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None)
    is_admin: bool = Field(default=False)

    kind: str = Field(default=ReviewKind.GENERAL.value, max_length=20, index=True)
    allocation_id: Optional[uuid.UUID] = Field(default=None, index=True)
    session_date: Optional[date] = Field(default=None)
    scheduled_time: Optional[str] = Field(default=None, max_length=20)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

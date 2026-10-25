from __future__ import annotations
import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.features.teachers.models import IjazaType


class IjazaResponse(BaseModel):
    id: uuid.UUID
    ijaza_type: IjazaType
    created_at: datetime

    model_config = {"from_attributes": True}


class TeacherProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    worked_online_before: bool
    juz_memorized: Optional[int] = None
    certificate_path: Optional[str] = None
    ijazas: list[IjazaResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeacherProfileUpdate(BaseModel):
    worked_online_before: Optional[bool] = None
    juz_memorized: Optional[int] = None


class TeacherReviewCreate(BaseModel):
    """An admin audit of a teacher. The lesson fields are optional, but come
    together: an audit either points at one lesson occurrence or at none."""
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)
    allocation_id: Optional[uuid.UUID] = None
    session_date: Optional[date] = None
    scheduled_time: Optional[str] = Field(default=None, max_length=20)


class TeacherReviewResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None
    reviewer_name: str
    rating: int
    comment: Optional[str] = None
    is_admin: bool
    # student_session | admin_audit | general
    kind: str
    allocation_id: Optional[uuid.UUID] = None
    session_date: Optional[date] = None
    scheduled_time: Optional[str] = None
    # The student in the reviewed lesson — resolved from the allocation, so
    # None for reviews not tied to a lesson or whose allocation is gone.
    student_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LessonReviewCreate(BaseModel):
    """A student rating one lesson they joined."""
    allocation_id: uuid.UUID
    session_date: date
    scheduled_time: str = Field(max_length=20)
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)


class ReviewableLesson(BaseModel):
    """A recent lesson the student joined, with their rating if they gave one."""
    allocation_id: uuid.UUID
    session_date: date
    scheduled_day: str
    scheduled_time: str
    teacher_name: str
    rating: Optional[int] = None
    comment: Optional[str] = None


class TeacherStudentResponse(BaseModel):
    """A student assigned to the calling teacher, with allocation details and a
    snapshot of their most recent session score."""
    allocation_id: uuid.UUID
    student_id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    sessions_per_week: int
    duration: int
    schedule: list = []
    last_score: Optional[int] = None
    last_max_score: Optional[int] = None
    last_session_date: Optional[datetime] = None


class TeacherPublicResponse(BaseModel):
    """Public-facing teacher profile — no internal/sensitive fields."""
    user_id: uuid.UUID
    full_name: str
    juz_memorized: Optional[int] = None
    ijazas: list[IjazaResponse] = []
    average_rating: Optional[float] = None
    review_count: int = 0

    model_config = {"from_attributes": True}


class PaginatedTeachers(BaseModel):
    items: list[TeacherPublicResponse]
    total: int
    limit: int
    offset: int

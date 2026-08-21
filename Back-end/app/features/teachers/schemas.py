from __future__ import annotations
import uuid
from datetime import datetime
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
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    # Falls back to the current user's name if omitted.
    reviewer_name: Optional[str] = None


class TeacherReviewResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    reviewer_id: Optional[uuid.UUID] = None
    reviewer_name: str
    rating: int
    comment: Optional[str] = None
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


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


class TeacherStatsResponse(BaseModel):
    """Backend-computed summary for the teacher's own Overview page — avoids
    the client fetching the full student roster just to reduce it in JS."""
    student_count: int
    sessions_per_week_total: int
    avg_score_pct: Optional[float] = None
    sessions_attended_total: int

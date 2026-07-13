from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

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

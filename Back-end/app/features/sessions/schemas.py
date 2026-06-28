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
    notes: Optional[str] = None
    recitation_type: Optional[str] = None

    model_config = {"from_attributes": True}

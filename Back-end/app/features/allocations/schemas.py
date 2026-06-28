from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel

class AllocationSchedule(BaseModel):
    day: str
    time: str

class AllocationCreate(BaseModel):
    teacher_id: uuid.UUID
    student_id: uuid.UUID
    sessions_per_week: int
    duration: int
    schedule: List[AllocationSchedule]

class AllocationResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    student_id: uuid.UUID
    sessions_per_week: int
    duration: int
    schedule: List[Any]
    created_at: datetime

    model_config = {"from_attributes": True}

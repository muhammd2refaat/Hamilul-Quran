from __future__ import annotations
import uuid
from datetime import date as date_type
from typing import Optional
from pydantic import BaseModel


class CalendarEvent(BaseModel):
    id: str
    allocation_id: uuid.UUID
    date: date_type
    day: str
    time: str
    duration: int
    teacher_id: uuid.UUID
    teacher_name: str
    student_id: uuid.UUID
    student_name: str
    meet_link: Optional[str] = None

from __future__ import annotations
import uuid
from datetime import date, datetime
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

class AllocationUpdate(BaseModel):
    teacher_id: Optional[uuid.UUID] = None
    student_id: Optional[uuid.UUID] = None
    sessions_per_week: Optional[int] = None
    duration: Optional[int] = None
    schedule: Optional[List[AllocationSchedule]] = None

class AllocationResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    student_id: uuid.UUID
    sessions_per_week: int
    duration: int
    schedule: List[Any]
    scheduled_until: Optional[date] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AllocationPreviewRequest(BaseModel):
    student_id: uuid.UUID
    duration: int
    schedule: List[AllocationSchedule]
    # When editing: leave this allocation's current slots out of the count.
    allocation_id: Optional[uuid.UUID] = None


class PreviewLesson(BaseModel):
    session_date: date
    day: str
    time: str
    # False = a lesson of one of the student's other allocations.
    this_allocation: bool


class MonthCount(BaseModel):
    month: str  # "YYYY-MM"
    count: int


class AllocationPreviewResponse(BaseModel):
    """The lessons an allocation would put on the calendar, given the
    student's remaining sessions."""
    subscription_status: Optional[str] = None
    plan_name: Optional[str] = None
    sessions_remaining: Optional[int] = None
    # No plan-tracked subscription: lessons repeat with no end; `lessons`
    # then lists only the first few.
    open_ended: bool
    ends_on: Optional[date] = None
    lessons: List[PreviewLesson]
    by_month: List[MonthCount]

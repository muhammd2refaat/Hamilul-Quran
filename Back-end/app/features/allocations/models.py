from __future__ import annotations
import uuid
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import JSON, Column
from sqlmodel import SQLModel, Field

class Allocation(SQLModel, table=True):
    __tablename__ = "allocations"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    teacher_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    sessions_per_week: int = Field(default=1)
    duration: int = Field(default=30)
    
    schedule: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))

    # Last date (Cairo) lessons are scheduled for: the date of the student's
    # final paid lesson, kept current by sessions/schedule.py as sessions are
    # used, refunded, excused or renewed. The Google Calendar series ends
    # here too. None = open-ended (no plan-tracked subscription).
    scheduled_until: Optional[date] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

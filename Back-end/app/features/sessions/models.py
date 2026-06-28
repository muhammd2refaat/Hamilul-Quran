from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

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
    score: int = Field(ge=0, le=100)
    notes: Optional[str] = Field(default=None)
    recitation_type: Optional[str] = Field(default=None, max_length=100)

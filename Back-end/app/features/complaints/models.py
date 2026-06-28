from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field

class ComplaintStatus(str, Enum):
    OPEN = "open"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class ComplaintFrom(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"

class ComplaintCategory(str, Enum):
    LATE_SESSION = "late_session"
    NO_FEEDBACK = "no_feedback"
    CURRICULUM = "curriculum"
    BEHAVIOUR = "behaviour"
    TECHNICAL = "technical"
    OTHER = "other"

class Complaint(SQLModel, table=True):
    __tablename__ = "complaints"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    about_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    
    complaint_from: ComplaintFrom
    category: ComplaintCategory
    
    subject: str = Field(max_length=255)
    description: str
    admin_note: Optional[str] = Field(default=None)
    
    status: ComplaintStatus = Field(default=ComplaintStatus.OPEN)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)

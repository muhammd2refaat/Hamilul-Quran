from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field

class ComplaintStatus(str, Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class Complaint(SQLModel, table=True):
    __tablename__ = "complaints"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    teacher_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    subject: str = Field(max_length=255)
    description: str
    status: ComplaintStatus = Field(default=ComplaintStatus.OPEN)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)

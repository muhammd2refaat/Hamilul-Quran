from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from app.features.complaints.models import ComplaintStatus, ComplaintFrom, ComplaintCategory


class ComplaintCreate(BaseModel):
    """Body for POST /complaints — filed by the currently authenticated user.
    `complaint_from` is inferred from their role on the server side."""
    about_id: Optional[uuid.UUID] = None
    category: ComplaintCategory
    subject: str
    description: str

    @field_validator("subject")
    @classmethod
    def subject_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("subject must not be blank")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("description must not be blank")
        return v.strip()


class ComplaintResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    about_id: Optional[uuid.UUID] = None
    complaint_from: ComplaintFrom
    category: ComplaintCategory
    subject: str
    description: str
    admin_note: Optional[str] = None
    status: ComplaintStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ComplaintGlobalResponse(ComplaintResponse):
    filed_by_name: str
    about_name: str


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    admin_note: Optional[str] = None

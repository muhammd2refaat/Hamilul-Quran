from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.features.complaints.models import ComplaintStatus, ComplaintFrom, ComplaintCategory

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

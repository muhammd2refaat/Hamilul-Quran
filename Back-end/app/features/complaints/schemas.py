from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ComplaintResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    teacher_id: Optional[uuid.UUID] = None
    subject: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

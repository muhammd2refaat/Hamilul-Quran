from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ReceiptResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    original_filename: str
    content_type: str
    amount: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class ReceiptGlobalResponse(ReceiptResponse):
    """Admin view — includes the student's resolved display name."""
    student_name: str

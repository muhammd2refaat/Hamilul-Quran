from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import SQLModel, Field

RECEIPT_RETENTION_DAYS = 30


def _default_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=RECEIPT_RETENTION_DAYS)


class Receipt(SQLModel, table=True):
    __tablename__ = "receipts"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    file_path: str = Field(max_length=500)
    original_filename: str = Field(max_length=255)
    content_type: str = Field(max_length=100)

    amount: Optional[str] = Field(default=None, max_length=50)
    note: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=_default_expiry, index=True)

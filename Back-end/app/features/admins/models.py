import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AdminAuditLog(SQLModel, table=True):
    """Who did what to which admin account, kept for the Super Admin.

    actor/target ids are deliberately NOT foreign keys and the emails are
    copied in: the log must outlive a deleted admin.
    """
    __tablename__ = "admin_audit_log"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True, nullable=False)
    actor_id: Optional[uuid.UUID] = Field(default=None, index=True)
    actor_email: str = Field(max_length=255)
    # created | updated | deleted | password_reset | password_changed |
    # password_reset_by_code | role_changed
    action: str = Field(max_length=40)
    target_id: Optional[uuid.UUID] = Field(default=None, index=True)
    target_email: Optional[str] = Field(default=None, max_length=255)
    details: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

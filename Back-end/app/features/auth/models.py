from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class GoogleCredential(SQLModel, table=True):
    """
    Stores a user's Google OAuth credentials so the platform can call Google APIs
    (Calendar) on their behalf for future lesson scheduling.

    The refresh_token is encrypted at rest (Fernet) — see app.core.crypto.
    """
    __tablename__ = "google_credentials"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # One Google credential record per user.
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    google_sub: str = Field(index=True, max_length=255)

    # Encrypted (Fernet) refresh token; short-lived access token stored as-is.
    refresh_token: Optional[str] = Field(default=None, max_length=1000)
    access_token: Optional[str] = Field(default=None, max_length=2000)
    token_expiry: Optional[datetime] = Field(default=None)
    scopes: Optional[str] = Field(default=None, max_length=1000)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

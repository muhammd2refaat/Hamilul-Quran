from __future__ import annotations
import uuid
from uuid import UUID
from datetime import datetime, date
from enum import Enum
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING = "PENDING"


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"


class AuthProvider(str, Enum):
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    email: str = Field(unique=True, index=True, max_length=255)
    username: str = Field(unique=True, index=True, max_length=255)
    first_name: str = Field(max_length=100, default="")
    last_name: str = Field(max_length=100, default="")
    phone_number: Optional[str] = Field(default=None, max_length=50)
    # Nullable: OAuth-only accounts (auth_provider=GOOGLE) have no local password.
    password_hash: Optional[str] = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.STUDENT)
    status: UserStatus = Field(default=UserStatus.PENDING)

    # Auth provider & Google identity (Google `sub`).
    auth_provider: AuthProvider = Field(default=AuthProvider.LOCAL)
    google_id: Optional[str] = Field(
        default=None, unique=True, index=True, max_length=255, nullable=True
    )

    country: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    gender: Optional[Gender] = Field(default=None)
    # The signup wizard collects age as a number; date_of_birth is kept for future use.
    age: Optional[int] = Field(default=None)
    date_of_birth: Optional[date] = Field(default=None)
    
    teacher_id: Optional[UUID] = Field(
        default=None, foreign_key="users.id", nullable=True, index=True
    )

    # ─── 2FA (admin accounts only) ─────────────────────────────────────────
    # totp_secret stores the Fernet-encrypted base32 TOTP secret.
    # Null means 2FA has never been set up for this account.
    totp_secret: Optional[str] = Field(default=None, nullable=True)
    totp_enabled: bool = Field(default=False)

    # ─── Admin accounts ────────────────────────────────────────────────────
    # The one Super Admin (settings.admin_email): manages the other admins
    # and can never be deleted, deactivated or demoted.
    is_super_admin: bool = Field(default=False)
    # Where this account's codes / temporary passwords go instead of email.
    recovery_email: Optional[str] = Field(default=None, max_length=255, nullable=True)
    # Set for a temporary password (new or reset admin) and for admins who
    # must pick a new one; admin routes are blocked until they do.
    must_change_password: bool = Field(default=False)
    temp_password_expires_at: Optional[datetime] = Field(default=None, nullable=True)
    # Tokens issued before this moment are rejected — set on password change
    # or reset to sign the account out everywhere.
    sessions_valid_after: Optional[datetime] = Field(default=None, nullable=True)

    joined_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )




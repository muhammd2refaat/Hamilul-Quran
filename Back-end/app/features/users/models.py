import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    SITE_ACCOUNTABLE = "SITE_ACCOUNTABLE"
    PROCUREMENT = "PROCUREMENT"
    TECHNICIAN = "TECHNICIAN"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    email: str = Field(unique=True, index=True, max_length=255)
    username: str = Field(unique=True, index=True, max_length=255)
    phone_number: str | None = Field(default=None, max_length=50)
    password_hash: str = Field(max_length=255)
    role: UserRole = Field(default=UserRole.SITE_ACCOUNTABLE)
    is_active: bool = Field(default=True)
    site_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="sites.id", nullable=True, index=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships
    if TYPE_CHECKING:
        from app.features.sites.models import Site
        managed_sites: list["Site"] = Relationship(back_populates="accountable_user")

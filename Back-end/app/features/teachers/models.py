from __future__ import annotations
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import SQLModel, Field


class IjazaType(str, Enum):
    HIFZ = "HIFZ"                    # Ijazah in Hifz
    TILAWAH = "TILAWAH"              # Ijazah in Tilawah
    HAFS_AN_ASIM = "HAFS_AN_ASIM"    # Ijazah Hafs ʿan ʿAsim
    TEN_QIRAAT = "TEN_QIRAAT"        # Ijazah in the Ten Qiraʾat
    OTHER = "OTHER"


class TeacherProfile(SQLModel, table=True):
    __tablename__ = "teacher_profiles"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # One profile per teacher user.
    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)

    worked_online_before: bool = Field(default=False)
    juz_memorized: Optional[int] = Field(default=None, ge=0, le=30)
    certificate_path: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )


class Ijaza(SQLModel, table=True):
    __tablename__ = "ijazas"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    # A teacher may hold more than one ijaza — one row per ijaza.
    teacher_profile_id: uuid.UUID = Field(
        foreign_key="teacher_profiles.id", index=True
    )
    ijaza_type: IjazaType = Field(default=IjazaType.OTHER)

    created_at: datetime = Field(default_factory=datetime.utcnow)

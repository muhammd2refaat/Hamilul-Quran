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
    password_hash: str = Field(max_length=255)
    role: UserRole = Field(default=UserRole.STUDENT)
    status: UserStatus = Field(default=UserStatus.PENDING)
    
    country: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    gender: Optional[Gender] = Field(default=None)
    date_of_birth: Optional[date] = Field(default=None)
    
    teacher_id: Optional[UUID] = Field(
        default=None, foreign_key="users.id", nullable=True, index=True
    )
    
    joined_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )
    
    # Gamification
    points: int = Field(default=0)
    articles_viewed: int = Field(default=0)
    webinars_attended: int = Field(default=0)
    stories_submitted: int = Field(default=0)
    webinars_registered: int = Field(default=0)
    quizzes_taken: int = Field(default=0)
    rank: int = Field(default=0)
    last_active: Optional[datetime] = Field(default=None)

    # Relationships (temporarily commented out due to Python 3.14 / SQLModel stringification bug)
    # teacher: User | None = Relationship(
    #     back_populates="students",
    #     sa_relationship_kwargs={"remote_side": "User.id"}
    # )
    # students: list[User] = Relationship(back_populates="teacher")


class ComplaintStatus(str, Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Complaint(SQLModel, table=True):
    __tablename__ = "complaints"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    teacher_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    subject: str = Field(max_length=255)
    description: str
    status: ComplaintStatus = Field(default=ComplaintStatus.OPEN)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)


class TeacherHistory(SQLModel, table=True):
    __tablename__ = "teacher_history"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    teacher_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    unassigned_at: Optional[datetime] = Field(default=None)
    reason: Optional[str] = Field(default=None)


class SessionScore(SQLModel, table=True):
    __tablename__ = "session_scores"

    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    student_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    teacher_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    
    date: datetime = Field(default_factory=datetime.utcnow)
    score: int = Field(ge=0, le=100)
    notes: Optional[str] = Field(default=None)
    recitation_type: Optional[str] = Field(default=None, max_length=100)


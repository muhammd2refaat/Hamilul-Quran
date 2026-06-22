from __future__ import annotations
import uuid
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.features.users.models import UserRole, UserStatus, Gender


# ─── Request Schemas ──────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    
    country: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    teacher_id: Optional[uuid.UUID] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    
    country: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    teacher_id: Optional[uuid.UUID] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


# ─── Response Schemas ─────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole
    status: UserStatus
    
    country: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None
    teacher_id: Optional[uuid.UUID] = None
    
    joined_date: datetime
    created_at: datetime
    updated_at: datetime
    
    # Gamification
    points: int
    articles_viewed: int
    webinars_attended: int
    stories_submitted: int
    webinars_registered: int
    quizzes_taken: int
    rank: int
    last_active: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PaginatedUsers(BaseModel):
    items: list[UserResponse]
    total: int
    limit: int
    offset: int

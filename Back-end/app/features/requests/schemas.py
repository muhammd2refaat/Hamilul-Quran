from __future__ import annotations
import re
import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.features.requests.models import (
    RequestStatus,
    RequestFromRole,
    RequestType,
)

# Deliberately permissive — accepts +country codes, spaces, dashes,
# parens, just requires enough digits to plausibly be a real number.
# Real deliverability isn't checked (that needs an SMS/WhatsApp API), only
# that the input looks like a phone number rather than garbage.
_PHONE_RE = re.compile(r"^[0-9+\-\s()]{6,30}$")


class RequestResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    from_role: RequestFromRole
    type: RequestType
    details: str
    current_day: Optional[str] = None
    current_time: Optional[str] = None
    requested_day: Optional[str] = None
    requested_time: Optional[str] = None
    requested_plan: Optional[str] = None
    requested_teacher: Optional[str] = None
    guest_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    admin_note: Optional[str] = None
    status: RequestStatus
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class RequestGlobalResponse(RequestResponse):
    """Admin view — includes the requester's resolved display name."""
    from_name: str


class RequestCreate(BaseModel):
    type: RequestType
    details: str
    current_day: Optional[str] = None
    current_time: Optional[str] = None
    requested_day: Optional[str] = None
    requested_time: Optional[str] = None
    requested_plan: Optional[str] = None
    requested_teacher: Optional[str] = None


class RequestStatusUpdate(BaseModel):
    status: RequestStatus
    admin_note: Optional[str] = None


class PublicTrialRequestCreate(BaseModel):
    """Public, unauthenticated "Free trial" form on the landing page
    (components/landing/LandingPage.tsx). No account exists yet, so contact
    details are collected directly rather than pulled from a User row —
    see RequestFromRole.GUEST / PlatformRequest.guest_* fields."""

    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: str
    program: str = Field(min_length=1, max_length=100)
    # Only the note is optional — matches the form (name/email/program/phone
    # required, message optional).
    message: Optional[str] = Field(default=None, max_length=2000)
    # Which language the landing page was in when submitted — used only to
    # pick the confirmation email's language (app/core/email_templates.py),
    # not stored on the request itself.
    lang: Literal["en", "ar"] = "en"

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number")
        return v

    @field_validator("full_name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

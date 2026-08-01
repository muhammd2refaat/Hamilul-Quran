"""
features/calendar/google_calendar_client.py
=============================================
Thin REST wrapper around the Google Calendar API (v3). Reuses the existing
OAuth token-refresh helper (app.features.auth.google) rather than adding the
heavier google-api-python-client dependency — consistent with how the rest
of this codebase talks to Google (direct httpx calls, see auth/google.py).
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.crypto import decrypt_secret
from app.features.auth.google import refresh_google_access_token, token_expiry_from
from app.features.auth.models import GoogleCredential

GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

DAY_TO_ICAL = {
    "mon": "MO", "tue": "TU", "wed": "WE", "thu": "TH",
    "fri": "FR", "sat": "SA", "sun": "SU",
}
DAY_TO_PY_WEEKDAY = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


def parse_time_str(time_str: str):
    """Parse a "11:00 AM" style string (as stored in Allocation.schedule) into a time."""
    return datetime.strptime(time_str.strip(), "%I:%M %p").time()


def next_occurrence(day: str, time_str: str, now: Optional[datetime] = None) -> datetime:
    """
    Next real (naive UTC) datetime >= now for a recurring weekday+time slot.
    `day` is one of the lowercase 3-letter ids used throughout the app
    ('sun'..'sat'); `time_str` is "HH:MM AM/PM".
    """
    now = now or datetime.utcnow()
    target_weekday = DAY_TO_PY_WEEKDAY[day]
    t = parse_time_str(time_str)
    days_ahead = (target_weekday - now.weekday()) % 7
    candidate = datetime.combine(now.date(), t) + timedelta(days=days_ahead)
    if candidate <= now:
        candidate += timedelta(days=7)
    return candidate


async def get_valid_access_token(
    session: AsyncSession, credential: GoogleCredential
) -> Optional[str]:
    """
    Return a usable Google access token for this credential, refreshing (and
    persisting the refresh) if it's missing/expired. Returns None if the user
    never connected a Google account with a refresh token.
    """
    if not credential.refresh_token:
        return None

    now = datetime.utcnow()
    if (
        credential.access_token
        and credential.token_expiry
        and credential.token_expiry > now + timedelta(minutes=2)
    ):
        return credential.access_token

    plaintext_refresh = decrypt_secret(credential.refresh_token)
    token_data = await refresh_google_access_token(plaintext_refresh)
    credential.access_token = token_data.get("access_token")
    credential.token_expiry = token_expiry_from(token_data)
    session.add(credential)
    await session.commit()
    return credential.access_token


async def create_weekly_event(
    access_token: str,
    summary: str,
    description: str,
    attendee_emails: list[str],
    day: str,
    time_str: str,
    duration_minutes: int,
) -> dict:
    """
    Create a weekly-recurring Google Calendar event with an auto-generated
    Meet link. Returns the raw Google event JSON (id, hangoutLink, ...).
    """
    start = next_occurrence(day, time_str)
    end = start + timedelta(minutes=duration_minutes)

    payload = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start.isoformat() + "Z", "timeZone": "UTC"},
        "end": {"dateTime": end.isoformat() + "Z", "timeZone": "UTC"},
        "recurrence": [f"RRULE:FREQ=WEEKLY;BYDAY={DAY_TO_ICAL[day]}"],
        "attendees": [{"email": email} for email in attendee_emails],
        "conferenceData": {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {"useDefault": True},
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_CALENDAR_EVENTS_URL,
            params={"conferenceDataVersion": 1, "sendUpdates": "all"},
            headers={"Authorization": f"Bearer {access_token}"},
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def delete_event(access_token: str, event_id: str) -> None:
    """
    Delete a Google Calendar event by id. 404/410 (already gone) are treated
    as success; any other error is raised for the caller to handle/log.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{GOOGLE_CALENDAR_EVENTS_URL}/{event_id}",
            params={"sendUpdates": "all"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if resp.status_code not in (200, 204, 404, 410):
            resp.raise_for_status()

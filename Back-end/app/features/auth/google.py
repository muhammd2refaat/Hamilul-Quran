"""
features/auth/google.py
=======================
Google OAuth client setup (Authlib) and helpers.

Two separate authorization requests (incremental authorization):

  • Sign-in / sign-up — basic identity only (openid email profile). These are
    non-sensitive scopes, so Google shows no "unverified app" warning.
  • Calendar connect — a teacher, already signed in, grants calendar.events
    from their dashboard. This one asks for an offline refresh token, stored
    encrypted server-side and used whenever an admin schedules a lesson.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.config.settings import settings

GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url=GOOGLE_DISCOVERY_URL,
    client_kwargs={"scope": settings.google_login_scopes},
)


async def build_authorize_redirect(request: Request) -> RedirectResponse:
    """
    Sign-in / sign-up redirect: basic identity only, so no unverified-app
    warning. No offline access is needed here — the Calendar refresh token
    comes from build_calendar_connect_redirect instead.
    """
    return await oauth.google.authorize_redirect(
        request,
        settings.google_redirect_uri,
        scope=settings.google_login_scopes,
        prompt="select_account",
    )


async def build_calendar_connect_redirect(request: Request, login_hint: str) -> RedirectResponse:
    """
    Teacher-only "Connect Google Calendar" redirect.

    access_type=offline + prompt=consent forces a refresh token, so the
    teacher connects once and lessons keep scheduling without them. Uses the
    same registered redirect URI as sign-in — the callback tells the two apart
    by the session intent. login_hint pre-selects the teacher's own account.
    """
    return await oauth.google.authorize_redirect(
        request,
        settings.google_redirect_uri,
        scope=f"{settings.google_login_scopes} {settings.google_calendar_scope}",
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        login_hint=login_hint,
    )


async def exchange_code(request: Request) -> dict[str, Any]:
    """
    Complete the code exchange at the callback. Returns the Authlib token dict,
    including access_token, refresh_token, expires_at, and parsed `userinfo`
    (email, sub, name, given_name, family_name).
    """
    token = await oauth.google.authorize_access_token(request)
    # Authlib parses the OIDC id_token into token["userinfo"]; fall back to the
    # userinfo endpoint if it is missing.
    if "userinfo" not in token:
        token["userinfo"] = await oauth.google.userinfo(token=token)
    return token


def token_expiry_from(token: dict[str, Any]) -> Optional[datetime]:
    """Derive an absolute expiry datetime (naive UTC) from an Authlib token dict.

    Returned naive to match the app's TIMESTAMP WITHOUT TIME ZONE columns.
    """
    dt: Optional[datetime] = None
    if token.get("expires_at"):
        dt = datetime.fromtimestamp(token["expires_at"], tz=timezone.utc)
    elif token.get("expires_in"):
        dt = datetime.now(timezone.utc) + timedelta(seconds=int(token["expires_in"]))
    return dt.replace(tzinfo=None) if dt else None


async def refresh_google_access_token(refresh_token: str) -> dict[str, Any]:
    """
    Exchange a stored Google refresh token for a fresh access token.
    Used by future Calendar scheduling. Returns the raw token response
    (access_token, expires_in, scope, ...).
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        return resp.json()

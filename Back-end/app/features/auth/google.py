"""
features/auth/google.py
=======================
Google OAuth client setup (Authlib) and helpers.

The backend runs the authorization-code flow so it can obtain an offline
refresh token (access_type=offline + prompt=consent) and store it server-side
for future Google Calendar scheduling.
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
    client_kwargs={"scope": settings.google_oauth_scopes},
)


async def build_authorize_redirect(request: Request) -> RedirectResponse:
    """
    Build the redirect to Google's consent screen.

    access_type=offline + prompt=consent forces Google to return a refresh
    token (needed for Calendar access) even on repeat logins.
    """
    return await oauth.google.authorize_redirect(
        request,
        settings.google_redirect_uri,
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
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

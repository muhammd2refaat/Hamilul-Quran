"""
core/cookies.py
================
HttpOnly auth-cookie helpers.

Tokens are still returned in JSON response bodies too (transitional: keeps
Swagger UI's "Authorize" button and any non-browser API client working), but
browser clients should prefer the cookie — it can't be read by JS, so an XSS
bug can no longer exfiltrate the token wholesale the way localStorage could.

get_current_user() (see dependencies.py) accepts either the cookie or a
Bearer Authorization header, cookie first.
"""

from fastapi import Request, Response

from app.config.settings import settings

ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"


def _is_secure_request(request: Request) -> bool:
    # Trusts X-Forwarded-Proto, set by Traefik and honored by uvicorn's
    # --proxy-headers — so this reads "https" in production even though the
    # backend itself only ever speaks plain HTTP behind the proxy.
    return request.url.scheme == "https"


def set_auth_cookies(
    response: Response,
    request: Request,
    access_token: str,
    refresh_token: str | None = None,
) -> None:
    secure = _is_secure_request(request)
    response.set_cookie(
        ACCESS_TOKEN_COOKIE,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    if refresh_token:
        response.set_cookie(
            REFRESH_TOKEN_COOKIE,
            refresh_token,
            max_age=settings.refresh_token_expire_days * 86400,
            httponly=True,
            secure=secure,
            samesite="lax",
            path="/",
        )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(REFRESH_TOKEN_COOKIE, path="/")

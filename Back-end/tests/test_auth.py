"""Tests for /auth/* — login, me, refresh, logout, swagger-login, and the
role/status guards enforced by get_current_user."""
import pytest

from app.features.users.models import UserRole, UserStatus


async def _login(client, email: str, password: str):
    return await client.post("/auth/login", json={"email": email, "password": password})


@pytest.mark.asyncio
async def test_login_success_returns_tokens(client, make_user):
    user = await make_user(email="login-ok@apitest.dev", username="login_ok", password="Correct123!")
    r = await _login(client, user.email, "Correct123!")
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0


@pytest.mark.asyncio
async def test_login_wrong_password_401(client, make_user):
    user = await make_user(email="login-badpw@apitest.dev", username="login_badpw", password="Correct123!")
    r = await _login(client, user.email, "WrongPassword!")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_401(client):
    r = await _login(client, "no-such-user@apitest.dev", "whatever123")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_suspended_user_401(client, make_user):
    user = await make_user(
        email="login-suspended@apitest.dev", username="login_suspended",
        password="Correct123!", status=UserStatus.SUSPENDED,
    )
    r = await _login(client, user.email, "Correct123!")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_google_only_account_is_rejected(client, make_user):
    """OAuth-only accounts (no password_hash) must be steered to Google, not
    accepted/rejected via a generic password mismatch."""
    from app.features.users.models import AuthProvider

    user = await make_user(
        email="login-google-only@apitest.dev", username="login_google_only",
        password_hash=None, auth_provider=AuthProvider.GOOGLE,
    )
    r = await _login(client, user.email, "anything")
    assert r.status_code == 401
    assert "google" in r.json()["message"].lower()


@pytest.mark.asyncio
async def test_auth_me_returns_current_user(client, admin_headers, admin_user):
    r = await client.get("/auth/me", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == str(admin_user.id)
    assert body["email"] == admin_user.email
    assert body["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_auth_me_without_token_401(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_with_garbage_token_401(client):
    r = await client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_refresh_issues_new_access_token(client, make_user):
    user = await make_user(email="refresh-ok@apitest.dev", username="refresh_ok", password="Correct123!")
    login_resp = await _login(client, user.email, "Correct123!")
    refresh_token = login_resp.json()["refresh_token"]

    r = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_refresh_with_garbage_token_401(client):
    r = await client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_refresh_token(client, make_user):
    """After logout, the same refresh token must no longer work (proves the
    fake-Redis-backed JTI revocation round-trip actually works)."""
    user = await make_user(email="logout-ok@apitest.dev", username="logout_ok", password="Correct123!")
    login_resp = await _login(client, user.email, "Correct123!")
    refresh_token = login_resp.json()["refresh_token"]

    r = await client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert r.status_code == 204

    r = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_swagger_login_accepts_form_data(client, make_user):
    user = await make_user(email="swagger-ok@apitest.dev", username="swagger_ok", password="Correct123!")
    r = await client.post(
        "/auth/swagger-login",
        data={"username": user.email, "password": "Correct123!"},
    )
    assert r.status_code == 200
    assert r.json()["access_token"]

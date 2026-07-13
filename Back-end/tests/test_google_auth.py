"""Tests for the Google OAuth callback + signup completion flow
(GoogleAuthService), mocking the Google token exchange so the real branching
logic is exercised without a live Google round-trip.

Covers the behaviors the product cares about:
  • new Google identity + signup intent   → pending registration → /register/complete
  • new Google identity + login intent     → rejected → /register/required (must sign up)
  • a hard-deleted user logging in again    → treated as new → routed to signup
  • existing ACTIVE user                    → logged in (tokens in the callback fragment)
  • existing SUSPENDED user                 → account_inactive
  • signup completion creates the account and is idempotent if already created
  • signup still works when Redis is DOWN   (in-memory fallback, no 500)
"""
import json

import pytest

from app.features.auth import google_service as gs_module
from app.features.auth.google_service import GoogleAuthService
from app.features.users.models import AuthProvider, Gender, User, UserRole, UserStatus
from app.features.users.service import UserService


class FakeRequest:
    """Minimal stand-in for a Starlette Request — handle_callback only touches
    `.session` (and passes the request to the mocked exchange_code)."""

    def __init__(self, session: dict):
        self.session = session


def _token(sub: str, email: str, name: str = "New Student"):
    return {
        "userinfo": {"sub": sub, "email": email, "name": name},
        "access_token": "fake-access-token",
        "refresh_token": "fake-refresh-token",
        "scope": "openid email profile",
        "expires_at": 9_999_999_999,
    }


def _mock_exchange(monkeypatch, token):
    async def _fake(_request):
        return token
    monkeypatch.setattr(gs_module, "exchange_code", _fake)


def _location(response) -> str:
    return response.headers["location"]


@pytest.fixture
def google_service(db_session, fake_redis):
    return GoogleAuthService(session=db_session, redis=fake_redis)


# ─── Callback branching ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_new_identity_signup_intent_starts_pending_registration(google_service, fake_redis, monkeypatch):
    _mock_exchange(monkeypatch, _token("google-sub-new-1", "brand-new@gmail.com"))
    request = FakeRequest({"oauth_intent": "signup", "oauth_role": "student"})

    resp = await google_service.handle_callback(request)

    assert resp.status_code == 302
    assert "/register/complete" in _location(resp)
    assert "registration_token=" in _location(resp)
    # The pending blob was actually stored in (fake) Redis.
    keys = await fake_redis.keys("hamilul_quran:pending_registration:*")
    assert len(keys) == 1


@pytest.mark.asyncio
async def test_new_identity_login_intent_is_rejected_to_register_required(google_service, monkeypatch):
    _mock_exchange(monkeypatch, _token("google-sub-new-2", "never-registered@gmail.com"))
    request = FakeRequest({"oauth_intent": "login", "oauth_role": None})

    resp = await google_service.handle_callback(request)

    assert resp.status_code == 302
    loc = _location(resp)
    assert "/register/required" in loc
    assert "error=not_registered" in loc


@pytest.mark.asyncio
async def test_hard_deleted_user_logging_in_is_routed_to_signup(
    google_service, db_session, make_user, monkeypatch
):
    """The behavior the admin flow depends on: after a user is hard-deleted,
    signing in with the same Google identity finds no account and routes to
    signup — NOT 'account inactive'."""
    user = await make_user(
        role=UserRole.STUDENT, email="will-be-deleted@gmail.com", username="will_be_deleted",
        google_id="google-sub-deleted", auth_provider=AuthProvider.GOOGLE, password_hash=None,
    )
    await UserService(session=db_session).delete(user.id)

    _mock_exchange(monkeypatch, _token("google-sub-deleted", "will-be-deleted@gmail.com"))
    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "login", "oauth_role": None})
    )

    assert resp.status_code == 302
    assert "error=not_registered" in _location(resp)
    assert "account_inactive" not in _location(resp)


@pytest.mark.asyncio
async def test_existing_active_user_is_logged_in(google_service, make_user, monkeypatch):
    await make_user(
        role=UserRole.STUDENT, email="active-google@gmail.com", username="active_google",
        google_id="google-sub-active", auth_provider=AuthProvider.GOOGLE, password_hash=None,
    )
    _mock_exchange(monkeypatch, _token("google-sub-active", "active-google@gmail.com"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "login", "oauth_role": None})
    )

    assert resp.status_code == 302
    loc = _location(resp)
    assert "/auth/callback#" in loc
    assert "access_token=" in loc and "refresh_token=" in loc


@pytest.mark.asyncio
async def test_existing_suspended_user_gets_account_inactive(google_service, make_user, monkeypatch):
    await make_user(
        role=UserRole.TEACHER, email="suspended-google@gmail.com", username="suspended_google",
        google_id="google-sub-suspended", auth_provider=AuthProvider.GOOGLE,
        password_hash=None, status=UserStatus.SUSPENDED,
    )
    _mock_exchange(monkeypatch, _token("google-sub-suspended", "suspended-google@gmail.com"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "login", "oauth_role": None})
    )

    assert resp.status_code == 302
    assert "error=account_inactive" in _location(resp)


@pytest.mark.asyncio
async def test_signup_intent_for_already_registered_active_user_logs_in(google_service, make_user, monkeypatch):
    """Signing UP with a Google account that's already registered & active
    just logs them in (no duplicate, no error)."""
    await make_user(
        role=UserRole.STUDENT, email="already-there@gmail.com", username="already_there",
        google_id="google-sub-already", auth_provider=AuthProvider.GOOGLE, password_hash=None,
    )
    _mock_exchange(monkeypatch, _token("google-sub-already", "already-there@gmail.com"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "signup", "oauth_role": "student"})
    )

    assert resp.status_code == 302
    assert "/auth/callback#" in _location(resp)


# ─── Signup completion ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_complete_registration_creates_student(google_service, db_session, fake_redis, monkeypatch):
    # Kick off a pending registration first.
    _mock_exchange(monkeypatch, _token("google-sub-complete", "complete-me@gmail.com", "Aisha Hassan"))
    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "signup", "oauth_role": "student"})
    )
    token = _location(resp).split("registration_token=")[1].split("&")[0]

    tokens = await google_service.complete_registration(
        registration_token=token, full_name="Aisha Hassan",
        country="KSA", phone_number="+966500000000", age=22, gender=Gender.FEMALE,
        worked_online_before=None, juz_memorized=None, ijazas=[], certificate=None,
    )
    assert tokens.access_token and tokens.refresh_token

    from sqlmodel import select
    user = (await db_session.exec(select(User).where(User.email == "complete-me@gmail.com"))).first()
    assert user is not None
    assert user.role == UserRole.STUDENT
    assert user.auth_provider == AuthProvider.GOOGLE
    assert user.status == UserStatus.ACTIVE
    assert user.google_id == "google-sub-complete"


@pytest.mark.asyncio
async def test_complete_registration_is_idempotent(google_service, make_user, fake_redis, monkeypatch):
    """If the account already exists when completing registration, it logs in
    rather than erroring / duplicating."""
    await make_user(
        role=UserRole.STUDENT, email="race@gmail.com", username="race",
        google_id="google-sub-race", auth_provider=AuthProvider.GOOGLE, password_hash=None,
    )
    # Seed a pending blob directly.
    blob = json.dumps({
        "role": "STUDENT", "google_sub": "google-sub-race", "email": "race@gmail.com",
        "full_name": "Race Condition", "refresh_token": None, "access_token": "x",
        "token_expiry": None, "scopes": "openid",
    })
    await fake_redis.setex("hamilul_quran:pending_registration:racetoken", 600, blob)

    tokens = await google_service.complete_registration(
        registration_token="racetoken", full_name="Race Condition",
        country="KSA", phone_number="+966500000000", age=22, gender=None,
        worked_online_before=None, juz_memorized=None, ijazas=[], certificate=None,
    )
    assert tokens.access_token


@pytest.mark.asyncio
async def test_complete_registration_expired_token_400(google_service):
    with pytest.raises(Exception) as exc_info:
        await google_service.complete_registration(
            registration_token="does-not-exist", full_name="X",
            country="KSA", phone_number="+966500000000", age=22, gender=None,
            worked_online_before=None, juz_memorized=None, ijazas=[], certificate=None,
        )
    assert getattr(exc_info.value, "status_code", None) == 400


# ─── Redis-down resilience (the reported 500 bug) ────────────────────────────

class _BrokenRedis:
    """Every operation raises, simulating Redis being down (connection refused)."""

    async def setex(self, *a, **k):
        raise ConnectionError("Error 61 connecting to localhost:6379. Connection refused.")

    async def get(self, *a, **k):
        raise ConnectionError("Error 61 connecting to localhost:6379. Connection refused.")

    async def delete(self, *a, **k):
        raise ConnectionError("Error 61 connecting to localhost:6379. Connection refused.")


@pytest.mark.asyncio
async def test_signup_works_when_redis_is_down(db_session, monkeypatch):
    """Reproduces the reported bug: with Redis down, Google signup previously
    500'd. It must now fall back to in-memory and complete successfully."""
    broken = _BrokenRedis()
    service = GoogleAuthService(session=db_session, redis=broken)

    # 1. Callback with signup intent must NOT raise — pending stored in memory.
    _mock_exchange(monkeypatch, _token("google-sub-noredis", "no-redis@gmail.com", "No Redis"))
    resp = await service.handle_callback(
        FakeRequest({"oauth_intent": "signup", "oauth_role": "student"})
    )
    assert resp.status_code == 302
    assert "/register/complete" in _location(resp)
    token = _location(resp).split("registration_token=")[1].split("&")[0]

    # 2. Completing the registration must read that in-memory blob and succeed.
    tokens = await service.complete_registration(
        registration_token=token, full_name="No Redis",
        country="KSA", phone_number="+966500000000", age=25, gender=Gender.MALE,
        worked_online_before=None, juz_memorized=None, ijazas=[], certificate=None,
    )
    assert tokens.access_token

    from sqlmodel import select
    user = (await db_session.exec(select(User).where(User.email == "no-redis@gmail.com"))).first()
    assert user is not None and user.status == UserStatus.ACTIVE

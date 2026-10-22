"""Tests for incremental Google authorization: sign-in asks only for basic
identity (no unverified-app warning), and teachers grant Calendar once via
the "Connect Google Calendar" flow.

Covers:
  • the sign-in redirect no longer requests calendar.events
  • the connect redirect requests it, offline, for teachers only
  • the callback's connect branch: success, unticked Calendar box, a
    different Google account, and a non-teacher
  • a later sign-in never overwrites a teacher's Calendar grant
  • connection-status endpoints for the teacher and the admin
  • the backfill only syncs allocations that have no event yet
"""
from urllib.parse import parse_qs, urlparse

import pytest
from sqlmodel import select

from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.allocations.service import AllocationService
from app.features.auth import google_service as gs_module
from app.features.auth.google_service import GoogleAuthService
from app.features.auth.models import GoogleCredential
from app.features.calendar.google_calendar_client import has_calendar_access
from app.features.users.models import AuthProvider, UserRole

CAL = settings.google_calendar_scope
BASIC = "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"


class _FakeURL:
    scheme = "https"


class FakeRequest:
    def __init__(self, session: dict):
        self.session = session
        self.url = _FakeURL()


def _token(sub, email, scope, refresh="calendar-refresh-token", verified=True):
    return {
        "userinfo": {"sub": sub, "email": email, "email_verified": verified, "name": "T"},
        "access_token": "access",
        "refresh_token": refresh,
        "scope": scope,
        "expires_at": 9_999_999_999,
    }


def _mock_exchange(monkeypatch, token):
    async def _fake(_request):
        return token
    monkeypatch.setattr(gs_module, "exchange_code", _fake)


@pytest.fixture
def google_service(db_session, fake_redis):
    return GoogleAuthService(session=db_session, redis=fake_redis)


async def _google_teacher(make_user, sub="g-teacher"):
    return await make_user(
        role=UserRole.TEACHER, google_id=sub, auth_provider=AuthProvider.GOOGLE, password_hash=None,
    )


async def _cred(db_session, user_id):
    result = await db_session.exec(select(GoogleCredential).where(GoogleCredential.user_id == user_id))
    return result.first()


def _outcome(resp):
    assert resp.status_code == 302
    loc = resp.headers["location"]
    assert "/dashboard/teacher?calendar=" in loc
    return parse_qs(urlparse(loc).query)["calendar"][0]


# ─── Redirect URLs ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_signin_redirect_requests_no_calendar_scope(client):
    r = await client.get("/auth/google/login?intent=signup&role=teacher", follow_redirects=False)
    assert r.status_code == 302
    scope = parse_qs(urlparse(r.headers["location"]).query)["scope"][0]
    assert "calendar" not in scope
    assert set(scope.split()) == {"openid", "email", "profile"}


@pytest.mark.asyncio
async def test_connect_redirect_requests_calendar_offline(client, teacher_headers):
    r = await client.get("/auth/google/calendar/connect", headers=teacher_headers, follow_redirects=False)
    assert r.status_code == 302
    q = parse_qs(urlparse(r.headers["location"]).query)
    assert CAL in q["scope"][0].split()
    assert q["access_type"] == ["offline"]
    assert q["prompt"] == ["consent"]


@pytest.mark.asyncio
async def test_connect_is_teacher_only(client, student_headers):
    r = await client.get("/auth/google/calendar/connect", headers=student_headers, follow_redirects=False)
    assert r.status_code == 403


# ─── Callback: connect branch ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_connect_stores_calendar_grant(google_service, make_user, db_session, monkeypatch):
    teacher = await _google_teacher(make_user)
    _mock_exchange(monkeypatch, _token("g-teacher", teacher.email, f"{BASIC} {CAL}"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "connect_calendar", "oauth_connect_user": str(teacher.id)})
    )

    assert _outcome(resp) == "connected"
    assert has_calendar_access(await _cred(db_session, teacher.id))


@pytest.mark.asyncio
async def test_connect_with_calendar_box_unticked_is_denied(google_service, make_user, db_session, monkeypatch):
    teacher = await _google_teacher(make_user)
    _mock_exchange(monkeypatch, _token("g-teacher", teacher.email, BASIC))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "connect_calendar", "oauth_connect_user": str(teacher.id)})
    )

    assert _outcome(resp) == "denied"
    assert not has_calendar_access(await _cred(db_session, teacher.id))


@pytest.mark.asyncio
async def test_connect_with_a_different_google_account_is_rejected(google_service, make_user, db_session, monkeypatch):
    teacher = await _google_teacher(make_user)
    _mock_exchange(monkeypatch, _token("someone-else", "other@gmail.com", f"{BASIC} {CAL}"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "connect_calendar", "oauth_connect_user": str(teacher.id)})
    )

    assert _outcome(resp) == "wrong_account"
    assert await _cred(db_session, teacher.id) is None


@pytest.mark.asyncio
async def test_connect_for_a_student_is_refused(google_service, make_user, monkeypatch):
    student = await make_user(role=UserRole.STUDENT, google_id="g-stu", auth_provider=AuthProvider.GOOGLE)
    _mock_exchange(monkeypatch, _token("g-stu", student.email, f"{BASIC} {CAL}"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "connect_calendar", "oauth_connect_user": str(student.id)})
    )

    assert _outcome(resp) == "error"


@pytest.mark.asyncio
async def test_signin_never_overwrites_a_teachers_calendar_grant(google_service, make_user, db_session, monkeypatch):
    teacher = await _google_teacher(make_user)
    _mock_exchange(monkeypatch, _token("g-teacher", teacher.email, f"{BASIC} {CAL}"))
    await google_service.handle_callback(
        FakeRequest({"oauth_intent": "connect_calendar", "oauth_connect_user": str(teacher.id)})
    )
    before = await _cred(db_session, teacher.id)
    refresh_before = before.refresh_token

    # A normal sign-in afterwards: basic scopes only, no refresh token.
    _mock_exchange(monkeypatch, _token("g-teacher", teacher.email, BASIC, refresh=None))
    resp = await google_service.handle_callback(FakeRequest({"oauth_intent": "login", "oauth_role": None}))
    assert "/auth/callback#" in resp.headers["location"]

    after = await _cred(db_session, teacher.id)
    assert after.refresh_token == refresh_before
    assert has_calendar_access(after)


# ─── Status endpoints ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_connection_status_reflects_the_grant(client, teacher_user, teacher_headers, db_session):
    r = await client.get("/calendar/connection", headers=teacher_headers)
    assert r.status_code == 200 and r.json() == {"connected": False}

    db_session.add(GoogleCredential(
        user_id=teacher_user.id, google_sub="s", refresh_token="enc", scopes=f"{BASIC} {CAL}",
    ))
    await db_session.commit()

    r = await client.get("/calendar/connection", headers=teacher_headers)
    assert r.json() == {"connected": True}


@pytest.mark.asyncio
async def test_basic_signin_credential_does_not_count_as_connected(client, teacher_user, teacher_headers, db_session):
    db_session.add(GoogleCredential(user_id=teacher_user.id, google_sub="s", scopes=BASIC))
    await db_session.commit()
    r = await client.get("/calendar/connection", headers=teacher_headers)
    assert r.json() == {"connected": False}


@pytest.mark.asyncio
async def test_admin_sees_every_teachers_connection(client, admin_headers, teacher_user, db_session):
    r = await client.get("/calendar/connections", headers=admin_headers)
    assert r.status_code == 200
    row = next(x for x in r.json() if x["teacher_id"] == str(teacher_user.id))
    assert row["connected"] is False


@pytest.mark.asyncio
async def test_connections_is_admin_only(client, teacher_headers):
    r = await client.get("/calendar/connections", headers=teacher_headers)
    assert r.status_code == 403


# ─── Backfill ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_backfill_only_syncs_allocations_without_an_event(db_session, teacher_user, student_user, monkeypatch):
    synced_ids = []

    async def _fake_create(self, allocation):
        synced_ids.append(allocation.id)

    monkeypatch.setattr(AllocationService, "_try_create_calendar_events", _fake_create)

    pending = Allocation(teacher_id=teacher_user.id, student_id=student_user.id, sessions_per_week=1,
                         duration=30, schedule=[{"day": "mon", "time": "10:00 AM"}])
    done = Allocation(teacher_id=teacher_user.id, student_id=student_user.id, sessions_per_week=1,
                      duration=30, schedule=[{"day": "tue", "time": "10:00 AM", "google_event_id": "evt"}])
    db_session.add_all([pending, done])
    await db_session.commit()

    count = await AllocationService(db_session).backfill_calendar_events(teacher_user.id)

    assert count == 1
    assert synced_ids == [pending.id]


# ─── Callback errors (Cancel on Google's screen, stale state) ────────────────

def _mock_exchange_error(monkeypatch, exc):
    async def _fail(_request):
        raise exc
    monkeypatch.setattr(gs_module, "exchange_code", _fail)


@pytest.mark.asyncio
async def test_cancel_on_connect_screen_returns_to_dashboard(google_service, make_user, monkeypatch):
    from authlib.integrations.base_client.errors import OAuthError
    teacher = await _google_teacher(make_user)
    _mock_exchange_error(monkeypatch, OAuthError(error="access_denied"))

    resp = await google_service.handle_callback(
        FakeRequest({"oauth_intent": "connect_calendar", "oauth_connect_user": str(teacher.id)})
    )

    assert _outcome(resp) == "denied"


@pytest.mark.asyncio
async def test_stale_state_on_signin_redirects_to_login_not_500(google_service, monkeypatch):
    from authlib.integrations.base_client.errors import MismatchingStateError
    _mock_exchange_error(monkeypatch, MismatchingStateError())

    resp = await google_service.handle_callback(FakeRequest({}))

    assert resp.status_code == 302
    assert "/login?error=google_identity_unavailable" in resp.headers["location"]


@pytest.mark.asyncio
async def test_callback_opened_directly_does_not_500(client):
    r = await client.get("/auth/google/callback", follow_redirects=False)
    assert r.status_code == 302
    assert "error=google_identity_unavailable" in r.headers["location"]

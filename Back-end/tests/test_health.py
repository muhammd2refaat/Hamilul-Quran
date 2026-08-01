"""Smoke tests validating the test infrastructure itself (fixtures, DB
isolation, real app wiring) before the feature-specific suites rely on it."""
import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    r = await client.get("/health")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema_loads(client):
    r = await client.get("/openapi.json")
    assert r.status_code == 200
    assert "paths" in r.json()


@pytest.mark.asyncio
async def test_make_user_and_auth_headers_work(client, admin_headers):
    r = await client.get("/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_db_isolation_between_tests(db_session, make_user):
    """Each test gets a fresh transaction — a user created here must not
    leak into other tests (verified by test_db_isolation_is_actually_clean)."""
    from sqlmodel import select
    from app.features.users.models import User

    await make_user(email="isolation-marker@apitest.dev", username="isolation_marker")
    result = await db_session.exec(select(User).where(User.email == "isolation-marker@apitest.dev"))
    assert result.first() is not None


@pytest.mark.asyncio
async def test_db_isolation_is_actually_clean(db_session):
    """If the previous test's rollback didn't work, this marker row would
    still be visible here."""
    from sqlmodel import select
    from app.features.users.models import User

    result = await db_session.exec(select(User).where(User.email == "isolation-marker@apitest.dev"))
    assert result.first() is None

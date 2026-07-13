"""
tests/conftest.py
==================
Shared pytest fixtures for the whole backend test suite.

- Uses a dedicated Postgres database (hamilul_quran_test by default,
  override with TEST_DATABASE_URL) — never touches the dev database.
- Each test runs inside its own outer transaction that's rolled back at
  teardown, with the app's own `session.commit()` calls redirected to
  SAVEPOINTs (`join_transaction_mode="create_savepoint"`) so the code under
  test can commit freely without breaking per-test isolation.
- Redis is faked (`fakeredis`) so the suite never depends on a real Redis
  instance being up, and each test gets a fresh, empty fake Redis.
- The real FastAPI app is exercised end-to-end via `httpx.AsyncClient` +
  `ASGITransport` (real routing/middleware/dependency injection), with only
  the DB session and Redis client dependencies swapped out.
"""
import os
import uuid
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config.settings import settings
from app.database.session import get_session
from app.infrastructure.redis.client import get_redis
from app.core.security import create_access_token, hash_password
import app.database.base  # noqa: F401 — populate SQLModel.metadata with every table
from app.features.users.models import User, UserRole, UserStatus

# ─── Test database ──────────────────────────────────────────────────────────────
# pytest-asyncio (function-scoped mode, the default here) spins up a fresh
# event loop per test, and asyncpg connections cannot be reused across event
# loops. So the engine is created fresh *inside* each fixture, scoped to
# whichever loop that fixture's test is running in — never as a shared
# module-level singleton. NullPool means each engine holds exactly one
# connection, matching the single explicit `.connect()` below.
_dev_url = make_url(settings.database_url)
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    _dev_url.set(database="hamilul_quran_test").render_as_string(hide_password=False),
)


@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
async def _setup_test_database():
    """Fresh schema once per test run, using its own short-lived engine
    (entirely within the session-scoped loop — never shared with per-test
    engines). Never runs against the dev database — TEST_DATABASE_URL is a
    distinct database from settings.database_url."""
    assert "test" in TEST_DATABASE_URL, (
        f"Refusing to run tests against a database that doesn't look like a "
        f"test DB: {TEST_DATABASE_URL}"
    )
    setup_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with setup_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    await setup_engine.dispose()
    yield


@pytest_asyncio.fixture
async def db_session():
    """A session bound to one connection + outer transaction, rolled back
    after the test. The app code's own commits become SAVEPOINTs. Uses a
    fresh, function-scoped engine so it never crosses event loops."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with engine.connect() as conn:
        outer_trans = await conn.begin()
        session_factory = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        async with session_factory() as session:
            yield session
        await outer_trans.rollback()
    await engine.dispose()


@pytest.fixture(autouse=True)
def _isolated_upload_dir(tmp_path, monkeypatch):
    """Redirect settings.upload_dir to a per-test temp directory so tests
    (receipts, certificates) never read/write the real dev uploads/ folder."""
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))


@pytest_asyncio.fixture
async def fake_redis():
    import fakeredis.aioredis

    redis = fakeredis.aioredis.FakeRedis()
    yield redis
    await redis.aclose()


@pytest_asyncio.fixture
async def client(db_session, fake_redis):
    """httpx AsyncClient wired to the real FastAPI app (real routing,
    middleware, and dependency injection), with only the DB session and
    Redis client swapped for test-scoped fakes."""
    from app.main import create_app

    app = create_app()

    async def _override_get_session():
        yield db_session

    async def _override_get_redis():
        yield fake_redis

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_redis] = _override_get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver/api/v1") as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── User factories ──────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
def make_user(db_session):
    """Factory fixture: await make_user(role=UserRole.STUDENT, status=...) -> User"""

    async def _make_user(
        role: UserRole = UserRole.STUDENT,
        status: UserStatus = UserStatus.ACTIVE,
        password: str = "TestPass123!",
        **overrides,
    ) -> User:
        suffix = uuid.uuid4().hex[:10]
        # Allow explicit password_hash=None (e.g. OAuth-only accounts) to
        # override the default hashed password.
        password_hash = (
            overrides.pop("password_hash")
            if "password_hash" in overrides
            else hash_password(password)
        )
        user = User(
            email=overrides.pop("email", f"test-{suffix}@apitest.dev"),
            username=overrides.pop("username", f"test_{suffix}"),
            first_name=overrides.pop("first_name", "Test"),
            last_name=overrides.pop("last_name", role.value.capitalize()),
            password_hash=password_hash,
            role=role,
            status=status,
            **overrides,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    return _make_user


def _auth_headers_for(user: User) -> dict:
    token = create_access_token(user.id, extra_claims={"role": user.role.value, "email": user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_user(make_user) -> User:
    return await make_user(role=UserRole.ADMIN)


@pytest_asyncio.fixture
def admin_headers(admin_user) -> dict:
    return _auth_headers_for(admin_user)


@pytest_asyncio.fixture
async def teacher_user(make_user) -> User:
    return await make_user(role=UserRole.TEACHER)


@pytest_asyncio.fixture
def teacher_headers(teacher_user) -> dict:
    return _auth_headers_for(teacher_user)


@pytest_asyncio.fixture
async def student_user(make_user) -> User:
    return await make_user(role=UserRole.STUDENT)


@pytest_asyncio.fixture
def student_headers(student_user) -> dict:
    return _auth_headers_for(student_user)


@pytest.fixture
def auth_headers_for():
    """Callable fixture: auth_headers_for(user) -> dict, for ad-hoc users
    created via make_user in a test body."""
    return _auth_headers_for

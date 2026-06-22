"""
Shared pytest fixtures for the Solar ERP test suite.

These fixtures provide:
- An in-memory SQLite async session for fast unit tests
- Mock Redis client
- Pre-seeded test users with each role
- HTTP test client (AsyncClient)
"""
import asyncio
import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel

from app.core.config import settings
from app.core.database import get_session
from app.core.redis_client import get_redis
from app.core.security import hash_password
from app.features.users.models import User, UserRole
from app.features.sites.models import Site
from app.features.suppliers.models import Supplier
from app.features.inventory.models import InventoryItem, InventoryStock, ItemCategory
from app.main import create_app

# Use SQLite for tests (in-memory, no Docker needed)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
async def engine():
    _engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield _engine
    async with _engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await _engine.dispose()


@pytest_asyncio.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean database session for each test."""
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as sess:
        yield sess
        await sess.rollback()
        # Clean all tables after each test
        for table in reversed(SQLModel.metadata.sorted_tables):
            await sess.execute(table.delete())
        await sess.commit()


@pytest.fixture
def mock_redis():
    """Mock Redis client — prevents real Redis connections in unit tests."""
    redis = AsyncMock()
    redis.publish = AsyncMock(return_value=1)
    redis.setex = AsyncMock(return_value=True)
    redis.get = AsyncMock(return_value=None)
    redis.delete = AsyncMock(return_value=1)
    redis.ping = AsyncMock(return_value=True)
    return redis


@pytest_asyncio.fixture
async def admin_user(session: AsyncSession) -> User:
    user = User(
        email="admin@test.io",
        password_hash=hash_password("Admin@1234!"),
        role=UserRole.ADMIN,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def site_user(session: AsyncSession) -> User:
    user = User(
        email="site@test.io",
        password_hash=hash_password("Site@1234!"),
        role=UserRole.SITE_ACCOUNTABLE,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_site_a(session: AsyncSession, site_user: User) -> Site:
    site = Site(name="Test Site A", location="Cairo", accountable_user_id=site_user.id)
    session.add(site)
    await session.commit()
    await session.refresh(site)
    return site


@pytest_asyncio.fixture
async def test_site_b(session: AsyncSession) -> Site:
    site = Site(name="Test Site B", location="Alexandria")
    session.add(site)
    await session.commit()
    await session.refresh(site)
    return site


@pytest_asyncio.fixture
async def test_supplier(session: AsyncSession) -> Supplier:
    supplier = Supplier(
        company_name="Test Supplier",
        contact_name="Test Contact",
        email="contact@test.io",
        phone="+20-1-23456789",
    )
    session.add(supplier)
    await session.commit()
    await session.refresh(supplier)
    return supplier


@pytest_asyncio.fixture
async def test_item(session: AsyncSession, test_supplier: Supplier) -> InventoryItem:
    item = InventoryItem(
        name="Test Inverter",
        category=ItemCategory.INVERTER,
        model_number="TEST-INV-001",
        supplier_id=test_supplier.id,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@pytest_asyncio.fixture
async def stock_a(
    session: AsyncSession, test_site_a: Site, test_item: InventoryItem
) -> InventoryStock:
    stock = InventoryStock(
        site_id=test_site_a.id,
        item_id=test_item.id,
        quantity_available=10,
        quantity_faulty=0,
        min_safety_threshold=2,
    )
    session.add(stock)
    await session.commit()
    await session.refresh(stock)
    return stock


@pytest_asyncio.fixture
async def stock_b(
    session: AsyncSession, test_site_b: Site, test_item: InventoryItem
) -> InventoryStock:
    stock = InventoryStock(
        site_id=test_site_b.id,
        item_id=test_item.id,
        quantity_available=0,
        quantity_faulty=0,
        min_safety_threshold=1,
    )
    session.add(stock)
    await session.commit()
    await session.refresh(stock)
    return stock


@pytest_asyncio.fixture
async def app(session: AsyncSession, mock_redis) -> FastAPI:
    """FastAPI app with overridden dependencies pointing at test DB/Redis."""
    _app = create_app()

    async def override_session():
        yield session

    async def override_redis():
        yield mock_redis

    _app.dependency_overrides[get_session] = override_session
    _app.dependency_overrides[get_redis] = override_redis
    return _app


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


async def get_auth_headers(client: AsyncClient, email: str, password: str) -> dict:
    """Helper to log in and return Authorization header dict."""
    resp = await client.post(
        f"{settings.api_prefix}/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

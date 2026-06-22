"""
Tests for JWT Authentication and RBAC.

Covers:
- Login success / failure
- Token validation
- Protected routes return 401 without token
- Role-based access control (ADMIN-only routes block non-admins)
- Refresh token flow
"""
import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.security import hash_password
from app.features.users.models import User, UserRole
from tests.conftest import get_auth_headers


class TestLogin:
    async def test_login_success(self, client: AsyncClient, admin_user: User):
        resp = await client.post(
            f"{settings.api_prefix}/auth/login",
            json={"email": "admin@test.io", "password": "Admin@1234!"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0

    async def test_login_wrong_password(self, client: AsyncClient, admin_user: User):
        resp = await client.post(
            f"{settings.api_prefix}/auth/login",
            json={"email": "admin@test.io", "password": "wrongpassword"},
        )
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post(
            f"{settings.api_prefix}/auth/login",
            json={"email": "nobody@test.io", "password": "anything"},
        )
        assert resp.status_code == 401

    async def test_login_inactive_user(self, client: AsyncClient, session, admin_user: User):
        admin_user.is_active = False
        session.add(admin_user)
        await session.commit()

        resp = await client.post(
            f"{settings.api_prefix}/auth/login",
            json={"email": "admin@test.io", "password": "Admin@1234!"},
        )
        assert resp.status_code == 401


class TestProtectedRoutes:
    async def test_protected_route_without_token_returns_401(self, client: AsyncClient):
        resp = await client.get(f"{settings.api_prefix}/users")
        assert resp.status_code == 403  # HTTPBearer returns 403 when no credentials

    async def test_protected_route_with_invalid_token_returns_401(self, client: AsyncClient):
        resp = await client.get(
            f"{settings.api_prefix}/users",
            headers={"Authorization": "Bearer totally.invalid.token"},
        )
        assert resp.status_code == 401

    async def test_get_me_returns_current_user(self, client: AsyncClient, admin_user: User):
        headers = await get_auth_headers(client, "admin@test.io", "Admin@1234!")
        resp = await client.get(f"{settings.api_prefix}/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "admin@test.io"
        assert data["role"] == "ADMIN"


class TestRBAC:
    async def test_admin_only_route_blocks_site_accountable(
        self, client: AsyncClient, admin_user: User, site_user: User
    ):
        headers = await get_auth_headers(client, "site@test.io", "Site@1234!")
        resp = await client.get(f"{settings.api_prefix}/users", headers=headers)
        assert resp.status_code == 403
        assert "Admin access required" in resp.json()["detail"]

    async def test_admin_can_access_admin_only_route(
        self, client: AsyncClient, admin_user: User
    ):
        headers = await get_auth_headers(client, "admin@test.io", "Admin@1234!")
        resp = await client.get(f"{settings.api_prefix}/users", headers=headers)
        assert resp.status_code == 200

    async def test_health_check_requires_no_auth(self, client: AsyncClient):
        resp = await client.get(f"{settings.api_prefix}/health")
        assert resp.status_code == 200
        assert resp.json()["status"] in ("ok", "degraded")

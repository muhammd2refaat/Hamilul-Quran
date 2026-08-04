"""Tests for app.main.create_app() — mainly that API docs are disabled when
app_env=="production", since /docs, /redoc, and /openapi.json expose every
route/schema/auth-scheme and shouldn't be public in prod."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.config.settings import settings
from app.main import create_app


@pytest.mark.asyncio
async def test_docs_disabled_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    app = create_app()
    assert app.docs_url is None
    assert app.redoc_url is None
    assert app.openapi_url is None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        assert (await client.get(f"{settings.api_prefix}/docs")).status_code == 404
        assert (await client.get(f"{settings.api_prefix}/redoc")).status_code == 404
        assert (await client.get(f"{settings.api_prefix}/openapi.json")).status_code == 404


@pytest.mark.asyncio
async def test_docs_enabled_outside_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    app = create_app()
    assert app.docs_url == f"{settings.api_prefix}/docs"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        assert (await client.get(f"{settings.api_prefix}/docs")).status_code == 200
        assert (await client.get(f"{settings.api_prefix}/openapi.json")).status_code == 200

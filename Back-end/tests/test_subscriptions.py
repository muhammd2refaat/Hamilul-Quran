"""Tests for /subscriptions/* — admin upsert (create-or-update), me, list."""
from datetime import date

import pytest


@pytest.mark.asyncio
async def test_upsert_creates_new_subscription(client, admin_headers, student_user):
    r = await client.put(
        f"/subscriptions/{student_user.id}", headers=admin_headers,
        json={"plan_name": "2 sessions/week — Hifz", "status": "active", "start_date": str(date.today())},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["plan_name"] == "2 sessions/week — Hifz"
    assert body["status"] == "active"


@pytest.mark.asyncio
async def test_upsert_requires_admin(client, student_headers, student_user):
    r = await client.put(
        f"/subscriptions/{student_user.id}", headers=student_headers,
        json={"plan_name": "p", "status": "active", "start_date": str(date.today())},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_upsert_updates_existing_not_duplicate(client, admin_headers, db_session, student_user):
    from sqlmodel import select
    from app.features.subscriptions.models import Subscription

    await client.put(
        f"/subscriptions/{student_user.id}", headers=admin_headers,
        json={"plan_name": "Plan A", "status": "active", "start_date": str(date.today())},
    )
    r = await client.put(
        f"/subscriptions/{student_user.id}", headers=admin_headers,
        json={"plan_name": "Plan A", "status": "paused", "start_date": str(date.today())},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paused"

    rows = (
        await db_session.exec(select(Subscription).where(Subscription.student_id == student_user.id))
    ).all()
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_get_my_subscription(client, admin_headers, student_headers, student_user):
    await client.put(
        f"/subscriptions/{student_user.id}", headers=admin_headers,
        json={"plan_name": "My Plan", "status": "active", "start_date": str(date.today())},
    )
    r = await client.get("/subscriptions/me", headers=student_headers)
    assert r.status_code == 200
    assert r.json()["plan_name"] == "My Plan"


@pytest.mark.asyncio
async def test_get_my_subscription_404_when_none(client, student_headers):
    r = await client.get("/subscriptions/me", headers=student_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_subscriptions_as_admin_includes_student_name(client, admin_headers, student_user):
    await client.put(
        f"/subscriptions/{student_user.id}", headers=admin_headers,
        json={"plan_name": "p", "status": "active", "start_date": str(date.today())},
    )
    r = await client.get("/subscriptions", headers=admin_headers)
    assert r.status_code == 200
    match = next((s for s in r.json() if s["student_id"] == str(student_user.id)), None)
    assert match is not None
    assert match["student_name"] == f"{student_user.first_name} {student_user.last_name}"

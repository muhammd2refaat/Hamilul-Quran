"""Tests for /calendar/* — projected upcoming sessions from allocation
schedules (no live Google API calls; verified with no GoogleCredential
present, matching the "teacher never connected Google" no-op path)."""
import pytest


@pytest.mark.asyncio
async def test_my_calendar_empty_when_no_allocations(client, student_headers):
    r = await client.get("/calendar/me?weeks=4", headers=student_headers)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_my_calendar_projects_from_allocation(client, admin_headers, teacher_headers, teacher_user, student_user):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [{"day": "mon", "time": "10:00 AM"}],
        },
    )
    r = await client.get("/calendar/me?weeks=4", headers=teacher_headers)
    assert r.status_code == 200
    events = r.json()
    assert len(events) >= 1
    assert events[0]["teacher_id"] == str(teacher_user.id)
    assert events[0]["student_id"] == str(student_user.id)
    assert events[0]["day"] == "mon"


@pytest.mark.asyncio
async def test_calendar_admin_requires_admin(client, student_headers):
    r = await client.get("/calendar?weeks=4", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_calendar_admin_sees_all(client, admin_headers, teacher_user, student_user):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [{"day": "fri", "time": "02:00 PM"}],
        },
    )
    r = await client.get("/calendar?weeks=4", headers=admin_headers)
    assert r.status_code == 200
    assert any(e["teacher_id"] == str(teacher_user.id) for e in r.json())


@pytest.mark.asyncio
async def test_calendar_weeks_out_of_range_rejected(client, student_headers):
    r = await client.get("/calendar/me?weeks=99", headers=student_headers)
    assert r.status_code == 422

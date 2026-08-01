"""Tests for /allocations/* — create/list/me/patch/delete."""
import uuid

import pytest


@pytest.mark.asyncio
async def test_create_allocation_as_admin(client, admin_headers, teacher_user, student_user):
    r = await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 2, "duration": 30,
            "schedule": [{"day": "mon", "time": "10:00 AM"}, {"day": "wed", "time": "10:00 AM"}],
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["teacher_id"] == str(teacher_user.id)
    assert body["student_id"] == str(student_user.id)
    assert len(body["schedule"]) == 2


@pytest.mark.asyncio
async def test_create_allocation_requires_admin(client, teacher_headers, student_user):
    r = await client.post(
        "/allocations", headers=teacher_headers,
        json={
            "teacher_id": str(uuid.uuid4()), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [],
        },
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_allocations_as_admin(client, admin_headers, teacher_user, student_user):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [{"day": "fri", "time": "09:00 AM"}],
        },
    )
    r = await client.get("/allocations", headers=admin_headers)
    assert r.status_code == 200
    assert any(a["teacher_id"] == str(teacher_user.id) for a in r.json())


@pytest.mark.asyncio
async def test_allocations_me_scoped_to_role(client, admin_headers, teacher_headers, student_headers, teacher_user, student_user):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [{"day": "sun", "time": "08:00 AM"}],
        },
    )
    r = await client.get("/allocations/me", headers=teacher_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.get("/allocations/me", headers=student_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_update_allocation_schedule(client, admin_headers, teacher_user, student_user):
    r = await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [{"day": "mon", "time": "10:00 AM"}],
        },
    )
    alloc_id = r.json()["id"]

    r = await client.patch(
        f"/allocations/{alloc_id}", headers=admin_headers,
        json={"duration": 45, "schedule": [{"day": "tue", "time": "05:00 PM"}]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["duration"] == 45
    assert body["schedule"][0]["day"] == "tue"


@pytest.mark.asyncio
async def test_update_allocation_not_found(client, admin_headers):
    r = await client.patch(f"/allocations/{uuid.uuid4()}", headers=admin_headers, json={"duration": 45})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_allocation(client, admin_headers, teacher_user, student_user):
    r = await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [],
        },
    )
    alloc_id = r.json()["id"]

    r = await client.delete(f"/allocations/{alloc_id}", headers=admin_headers)
    assert r.status_code == 204

    r = await client.get("/allocations", headers=admin_headers)
    assert not any(a["id"] == alloc_id for a in r.json())


@pytest.mark.asyncio
async def test_delete_allocation_not_found(client, admin_headers):
    r = await client.delete(f"/allocations/{uuid.uuid4()}", headers=admin_headers)
    assert r.status_code == 404

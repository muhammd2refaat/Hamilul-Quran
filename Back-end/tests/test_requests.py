"""Tests for /requests/* — create (student), list/me, admin status update."""
import uuid

import pytest


@pytest.mark.asyncio
async def test_create_request_as_student(client, student_headers):
    r = await client.post(
        "/requests", headers=student_headers,
        json={"type": "other", "from_role": "student", "details": "Please pause my sessions"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["type"] == "other"
    assert body["status"] == "pending"


@pytest.mark.asyncio
async def test_create_request_full_reschedule_shape(client, student_headers):
    r = await client.post(
        "/requests", headers=student_headers,
        json={
            "type": "reschedule", "from_role": "student", "details": "Work schedule changed",
            "current_day": "tue", "current_time": "10:00 AM",
            "requested_day": "thu", "requested_time": "04:00 PM",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["current_day"] == "tue"
    assert body["requested_day"] == "thu"


@pytest.mark.asyncio
async def test_requests_me_only_shows_own(client, student_headers, make_user):
    other_student = await make_user(email="other-req@apitest.dev", username="other_req")
    from app.core.security import create_access_token

    other_headers = {"Authorization": f"Bearer {create_access_token(other_student.id, extra_claims={'role': 'STUDENT'})}"}

    await client.post("/requests", headers=student_headers, json={"type": "other", "from_role": "student", "details": "mine"})
    await client.post("/requests", headers=other_headers, json={"type": "other", "from_role": "student", "details": "not mine"})

    r = await client.get("/requests/me", headers=student_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["details"] == "mine"


@pytest.mark.asyncio
async def test_list_requests_requires_admin(client, student_headers):
    r = await client.get("/requests", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_requests_as_admin_includes_from_name(client, admin_headers, student_headers, student_user):
    await client.post("/requests", headers=student_headers, json={"type": "other", "from_role": "student", "details": "d"})
    r = await client.get("/requests", headers=admin_headers)
    assert r.status_code == 200
    match = next((req for req in r.json() if req["user_id"] == str(student_user.id)), None)
    assert match is not None
    assert match["from_name"] == f"{student_user.first_name} {student_user.last_name}"


@pytest.mark.asyncio
async def test_update_request_status(client, admin_headers, student_headers):
    r = await client.post("/requests", headers=student_headers, json={"type": "other", "from_role": "student", "details": "d"})
    request_id = r.json()["id"]

    r = await client.patch(
        f"/requests/{request_id}/status", headers=admin_headers,
        json={"status": "approved", "admin_note": "Approved by admin"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "approved"
    assert body["admin_note"] == "Approved by admin"


@pytest.mark.asyncio
async def test_update_request_status_not_found(client, admin_headers):
    r = await client.patch(f"/requests/{uuid.uuid4()}/status", headers=admin_headers, json={"status": "approved"})
    assert r.status_code == 404

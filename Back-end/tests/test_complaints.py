"""Tests for /complaints/* — admin list + status update.
No POST endpoint exists yet (known gap — see Back-end/PROGRESS.md backlog)."""
import uuid

import pytest


@pytest.mark.asyncio
async def test_list_complaints_requires_admin(client, student_headers):
    r = await client.get("/complaints", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_complaints_as_admin(client, admin_headers, db_session, student_user, teacher_user):
    from app.features.complaints.models import Complaint, ComplaintFrom, ComplaintCategory

    complaint = Complaint(
        user_id=student_user.id, about_id=teacher_user.id,
        complaint_from=ComplaintFrom.STUDENT, category=ComplaintCategory.TECHNICAL,
        subject="Audio issues", description="Couldn't hear the teacher",
    )
    db_session.add(complaint)
    await db_session.commit()

    r = await client.get("/complaints", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    match = next((c for c in body if c["id"] == str(complaint.id)), None)
    assert match is not None
    assert match["filed_by_name"] == f"{student_user.first_name} {student_user.last_name}"
    assert match["about_name"] == f"{teacher_user.first_name} {teacher_user.last_name}"
    assert match["status"] == "open"


@pytest.mark.asyncio
async def test_update_complaint_status(client, admin_headers, db_session, student_user, teacher_user):
    from app.features.complaints.models import Complaint, ComplaintFrom, ComplaintCategory

    complaint = Complaint(
        user_id=student_user.id, about_id=teacher_user.id,
        complaint_from=ComplaintFrom.STUDENT, category=ComplaintCategory.OTHER,
        subject="s", description="d",
    )
    db_session.add(complaint)
    await db_session.commit()
    await db_session.refresh(complaint)

    r = await client.patch(
        f"/complaints/{complaint.id}/status", headers=admin_headers,
        json={"status": "resolved", "admin_note": "Fixed it"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "resolved"
    assert body["admin_note"] == "Fixed it"
    assert body["resolved_at"] is not None


@pytest.mark.asyncio
async def test_update_complaint_status_not_found(client, admin_headers):
    r = await client.patch(
        f"/complaints/{uuid.uuid4()}/status", headers=admin_headers, json={"status": "resolved"}
    )
    assert r.status_code == 404

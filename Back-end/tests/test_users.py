"""Tests for /users/* — list/create/get/patch, self-profile endpoints, and
the hard-delete cascade (the highest-risk piece of this feature)."""
import uuid

import pytest
from sqlmodel import select

from app.features.users.models import User, UserRole, UserStatus


@pytest.mark.asyncio
async def test_list_users_requires_admin(client, student_headers):
    r = await client.get("/users", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_users_as_admin(client, admin_headers, student_user):
    r = await client.get("/users", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body
    assert any(u["id"] == str(student_user.id) for u in body["items"])


@pytest.mark.asyncio
async def test_create_user_success(client, admin_headers):
    r = await client.post(
        "/users", headers=admin_headers,
        json={
            "email": "created-user@apitest.dev", "username": "created_user",
            "first_name": "Created", "last_name": "User", "role": "STUDENT",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "created-user@apitest.dev"
    assert body["role"] == "STUDENT"


@pytest.mark.asyncio
async def test_create_user_duplicate_email_conflict(client, admin_headers, student_user):
    r = await client.post(
        "/users", headers=admin_headers,
        json={
            "email": student_user.email, "username": "duplicate_attempt",
            "first_name": "Dup", "last_name": "Licate",
        },
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_user_short_password_rejected(client, admin_headers):
    r = await client.post(
        "/users", headers=admin_headers,
        json={
            "email": "shortpw@apitest.dev", "username": "shortpw",
            "first_name": "Short", "last_name": "Pw", "password": "abc",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_get_user_by_id(client, admin_headers, student_user):
    r = await client.get(f"/users/{student_user.id}", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["email"] == student_user.email


@pytest.mark.asyncio
async def test_get_user_not_found(client, admin_headers):
    r = await client.get(f"/users/{uuid.uuid4()}", headers=admin_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_user(client, admin_headers, student_user):
    r = await client.patch(f"/users/{student_user.id}", headers=admin_headers, json={"city": "Riyadh"})
    assert r.status_code == 200
    assert r.json()["city"] == "Riyadh"


@pytest.mark.asyncio
async def test_get_my_profile(client, student_headers, student_user):
    r = await client.get("/users/me", headers=student_headers)
    assert r.status_code == 200
    assert r.json()["id"] == str(student_user.id)


@pytest.mark.asyncio
async def test_me_sub_resources_empty_lists_for_new_user(client, student_headers):
    for path in ("/users/me/complaints", "/users/me/session-scores", "/users/me/teacher-history"):
        r = await client.get(path, headers=student_headers)
        assert r.status_code == 200
        assert r.json() == []


# ─── Hard-delete cascade ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_hard_delete_requires_admin(client, student_headers, teacher_user):
    r = await client.delete(f"/users/{teacher_user.id}", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_hard_delete_cascades_everything(client, admin_headers, db_session, make_user):
    """The full cascade: delete a teacher who has a profile+ijaza+review,
    an allocation with a student, a complaint, a request, a subscription,
    a receipt (+file), session history — and confirm every child row (and
    the file) is gone, the other student's teacher_id is nulled, and the
    email is free to reuse."""
    from datetime import date, datetime
    from pathlib import Path

    from app.config.settings import settings
    from app.features.allocations.models import Allocation
    from app.features.complaints.models import Complaint, ComplaintFrom, ComplaintCategory
    from app.features.receipts.models import Receipt
    from app.features.requests.models import PlatformRequest, RequestFromRole, RequestType
    from app.features.sessions.models import SessionScore, TeacherHistory
    from app.features.subscriptions.models import Subscription
    from app.features.teachers.models import Ijaza, IjazaType, TeacherProfile

    teacher = await make_user(role=UserRole.TEACHER, email="cascade-teacher@apitest.dev", username="cascade_teacher")
    student = await make_user(role=UserRole.STUDENT, email="cascade-student@apitest.dev", username="cascade_student")
    other_student = await make_user(
        role=UserRole.STUDENT, email="cascade-other@apitest.dev", username="cascade_other",
        teacher_id=teacher.id,
    )

    alloc = Allocation(teacher_id=teacher.id, student_id=student.id, sessions_per_week=1, duration=30, schedule=[])
    profile = TeacherProfile(user_id=teacher.id, worked_online_before=True)
    db_session.add_all([alloc, profile])
    await db_session.commit()
    await db_session.refresh(profile)

    ijaza = Ijaza(teacher_profile_id=profile.id, ijaza_type=IjazaType.HIFZ)
    complaint = Complaint(
        user_id=student.id, about_id=teacher.id, complaint_from=ComplaintFrom.STUDENT,
        category=ComplaintCategory.OTHER, subject="s", description="d",
    )
    req = PlatformRequest(
        user_id=teacher.id, from_role=RequestFromRole.TEACHER, type=RequestType.OTHER, details="d",
    )
    subscription = Subscription(student_id=student.id, plan_name="p", start_date=date.today())
    receipt_path = Path(settings.upload_dir) / "receipts" / "cascade-test-file.png"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_bytes(b"fake-image-bytes")
    receipt = Receipt(
        student_id=student.id, file_path="receipts/cascade-test-file.png",
        original_filename="cascade-test-file.png", content_type="image/png",
    )
    session_score = SessionScore(student_id=student.id, teacher_id=teacher.id, score=18, max_score=20)
    teacher_history = TeacherHistory(student_id=student.id, teacher_id=teacher.id, assigned_at=datetime.utcnow())

    db_session.add_all([ijaza, complaint, req, subscription, receipt, session_score, teacher_history])
    await db_session.commit()

    # ── Delete the teacher ──
    r = await client.delete(f"/users/{teacher.id}", headers=admin_headers)
    assert r.status_code == 204

    assert await db_session.get(User, teacher.id) is None
    assert await db_session.get(TeacherProfile, profile.id) is None
    assert await db_session.get(Ijaza, ijaza.id) is None
    assert await db_session.get(Allocation, alloc.id) is None
    assert (
        await db_session.exec(select(Complaint).where(Complaint.about_id == teacher.id))
    ).first() is None
    assert (
        await db_session.exec(select(PlatformRequest).where(PlatformRequest.user_id == teacher.id))
    ).first() is None
    assert (
        await db_session.exec(select(SessionScore).where(SessionScore.teacher_id == teacher.id))
    ).first() is None
    assert (
        await db_session.exec(select(TeacherHistory).where(TeacherHistory.teacher_id == teacher.id))
    ).first() is None

    await db_session.refresh(other_student)
    assert other_student.teacher_id is None

    email_free = (await db_session.exec(select(User).where(User.email == teacher.email))).first()
    assert email_free is None

    # ── Delete the student (owns the subscription + receipt) ──
    r = await client.delete(f"/users/{student.id}", headers=admin_headers)
    assert r.status_code == 204

    assert await db_session.get(User, student.id) is None
    assert await db_session.get(Subscription, subscription.id) is None
    assert await db_session.get(Receipt, receipt.id) is None
    assert not receipt_path.is_file(), "receipt file should be deleted from disk"

    # cleanup: the other_student row (not deleted by this test's cascade)
    await db_session.delete(other_student)
    await db_session.commit()


@pytest.mark.asyncio
async def test_hard_delete_not_found(client, admin_headers):
    r = await client.delete(f"/users/{uuid.uuid4()}", headers=admin_headers)
    assert r.status_code == 404

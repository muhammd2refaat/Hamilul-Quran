"""Tests for students rating individual lessons (/lesson-reviews), admin
audits tied to a lesson, the admin review breakdown, and the teacher
certificate download."""
from datetime import datetime, timedelta

import pytest

from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ
from app.features.sessions.models import AttendeeRole, SessionAttendance
from app.features.teachers.models import TeacherProfile
from app.features.users.models import UserRole

TIME = "10:00 AM"


def _days_ago(n):
    return datetime.now(CAIRO_TZ).date() - timedelta(days=n)


async def _allocation(db_session, teacher, student):
    allocation = Allocation(
        teacher_id=teacher.id, student_id=student.id, sessions_per_week=1, duration=30,
        schedule=[{"day": "mon", "time": TIME}],
    )
    db_session.add(allocation)
    await db_session.commit()
    return allocation


async def _joined(db_session, allocation, user, session_date, role=AttendeeRole.STUDENT):
    db_session.add(SessionAttendance(
        allocation_id=allocation.id, user_id=user.id, role=role, session_date=session_date,
        scheduled_day=session_date.strftime("%a").lower(), scheduled_time=TIME,
    ))
    await db_session.commit()


def _review(allocation, session_date, rating=5, comment=None):
    return {
        "allocation_id": str(allocation.id), "session_date": session_date.isoformat(),
        "scheduled_time": TIME, "rating": rating, "comment": comment,
    }


# ─── Student lesson ratings ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_student_sees_lessons_they_joined(client, db_session, student_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, student_user, _days_ago(2))

    r = await client.get("/lesson-reviews/me", headers=student_headers)
    assert r.status_code == 200
    [lesson] = r.json()
    assert lesson["session_date"] == _days_ago(2).isoformat()
    assert lesson["teacher_name"] == f"{teacher_user.first_name} {teacher_user.last_name}"
    assert lesson["rating"] is None


@pytest.mark.asyncio
async def test_lessons_outside_the_window_are_not_listed(client, db_session, student_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, student_user, _days_ago(30))

    r = await client.get("/lesson-reviews/me", headers=student_headers)
    assert r.json() == []


@pytest.mark.asyncio
async def test_student_rates_a_joined_lesson(client, db_session, student_headers, admin_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, student_user, _days_ago(1))

    r = await client.post("/lesson-reviews", headers=student_headers,
                          json=_review(allocation, _days_ago(1), 4, "Clear tajweed corrections"))
    assert r.status_code == 200
    body = r.json()
    assert body["kind"] == "student_session"
    assert body["teacher_id"] == str(teacher_user.id)
    assert body["is_admin"] is False

    listed = (await client.get("/lesson-reviews/me", headers=student_headers)).json()
    assert listed[0]["rating"] == 4

    # The admin sees it in the teacher's breakdown, with the lesson attached.
    [review] = (await client.get(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers)).json()
    assert review["session_date"] == _days_ago(1).isoformat()
    assert review["scheduled_time"] == TIME
    assert review["student_name"] == f"{student_user.first_name} {student_user.last_name}"
    assert review["comment"] == "Clear tajweed corrections"


@pytest.mark.asyncio
async def test_rating_the_same_lesson_again_edits_it(client, db_session, student_headers, admin_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, student_user, _days_ago(1))

    await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(1), 2))
    r = await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(1), 5))
    assert r.status_code == 200
    assert r.json()["updated_at"] is not None

    reviews = (await client.get(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers)).json()
    assert [x["rating"] for x in reviews] == [5]


@pytest.mark.asyncio
async def test_each_lesson_gets_its_own_rating(client, db_session, student_headers, admin_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    for n in (1, 8):
        await _joined(db_session, allocation, student_user, _days_ago(n))
        await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(n), 3 + (n == 8)))

    reviews = (await client.get(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers)).json()
    assert sorted(x["rating"] for x in reviews) == [3, 4]


@pytest.mark.asyncio
async def test_cannot_rate_a_lesson_not_joined(client, db_session, student_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)

    r = await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(1)))
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_rate_someone_elses_lesson(client, db_session, student_headers, student_user, teacher_user, make_user):
    other = await make_user(role=UserRole.STUDENT, email="other-student@apitest.dev", username="other_student")
    allocation = await _allocation(db_session, teacher_user, other)
    await _joined(db_session, allocation, other, _days_ago(1))

    r = await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(1)))
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_cannot_rate_an_old_lesson(client, db_session, student_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, student_user, _days_ago(20))

    r = await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(20)))
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_lesson_reviews_are_student_only(client, teacher_headers, admin_headers):
    assert (await client.get("/lesson-reviews/me", headers=teacher_headers)).status_code == 403
    assert (await client.get("/lesson-reviews/me", headers=admin_headers)).status_code == 403


@pytest.mark.asyncio
async def test_reviews_survive_allocation_delete(client, db_session, student_headers, admin_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, student_user, _days_ago(1))
    await client.post("/lesson-reviews", headers=student_headers, json=_review(allocation, _days_ago(1), 4))

    assert (await client.delete(f"/allocations/{allocation.id}", headers=admin_headers)).status_code in (200, 204)

    [review] = (await client.get(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers)).json()
    assert review["rating"] == 4
    assert review["student_name"] is None


# ─── Admin audits tied to a lesson ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_audits_a_specific_lesson(client, db_session, admin_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    r = await client.post(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers, json={
        "rating": 3, "comment": "Started 10 minutes late",
        "allocation_id": str(allocation.id), "session_date": _days_ago(3).isoformat(), "scheduled_time": TIME,
    })
    assert r.status_code == 201
    body = r.json()
    assert body["kind"] == "admin_audit"
    assert body["student_name"] == f"{student_user.first_name} {student_user.last_name}"


@pytest.mark.asyncio
async def test_audit_lesson_must_belong_to_the_teacher(client, db_session, admin_headers, student_user, teacher_user, make_user):
    other_teacher = await make_user(role=UserRole.TEACHER, email="t2@apitest.dev", username="t2")
    allocation = await _allocation(db_session, other_teacher, student_user)
    r = await client.post(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers, json={
        "rating": 3, "allocation_id": str(allocation.id),
        "session_date": _days_ago(3).isoformat(), "scheduled_time": TIME,
    })
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_audit_lesson_fields_come_together(client, db_session, admin_headers, student_user, teacher_user):
    allocation = await _allocation(db_session, teacher_user, student_user)
    r = await client.post(f"/teachers/{teacher_user.id}/reviews", headers=admin_headers,
                          json={"rating": 3, "allocation_id": str(allocation.id)})
    assert r.status_code == 422


# ─── Certificate download ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_downloads_teacher_certificate(client, db_session, admin_headers, student_headers, teacher_user, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    (tmp_path / "certificates").mkdir()
    (tmp_path / "certificates" / "abc.pdf").write_bytes(b"%PDF-1.4 test")
    db_session.add(TeacherProfile(user_id=teacher_user.id, certificate_path="certificates/abc.pdf"))
    await db_session.commit()

    r = await client.get(f"/teachers/{teacher_user.id}/certificate", headers=admin_headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content == b"%PDF-1.4 test"

    assert (await client.get(f"/teachers/{teacher_user.id}/certificate", headers=student_headers)).status_code == 403


@pytest.mark.asyncio
async def test_certificate_missing_is_404(client, db_session, admin_headers, teacher_user):
    db_session.add(TeacherProfile(user_id=teacher_user.id))
    await db_session.commit()

    r = await client.get(f"/teachers/{teacher_user.id}/certificate", headers=admin_headers)
    assert r.status_code == 404

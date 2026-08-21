"""Tests for /teachers/* (profile, reviews, roster) and POST /session-scores,
which is tightly coupled to the teacher role."""
import uuid

import pytest


@pytest.mark.asyncio
async def test_get_teacher_profile_self(client, teacher_headers, teacher_user, db_session):
    from app.features.teachers.models import TeacherProfile

    db_session.add(TeacherProfile(user_id=teacher_user.id, worked_online_before=True, juz_memorized=15))
    await db_session.commit()

    r = await client.get(f"/teachers/{teacher_user.id}", headers=teacher_headers)
    assert r.status_code == 200
    assert r.json()["juz_memorized"] == 15


@pytest.mark.asyncio
async def test_get_teacher_profile_other_user_forbidden(client, student_headers, teacher_user, db_session):
    from app.features.teachers.models import TeacherProfile

    db_session.add(TeacherProfile(user_id=teacher_user.id))
    await db_session.commit()

    r = await client.get(f"/teachers/{teacher_user.id}", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_get_teacher_profile_admin_can_view_any(client, admin_headers, teacher_user, db_session):
    from app.features.teachers.models import TeacherProfile

    db_session.add(TeacherProfile(user_id=teacher_user.id))
    await db_session.commit()

    r = await client.get(f"/teachers/{teacher_user.id}", headers=admin_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_get_teacher_profile_missing_404(client, teacher_headers, teacher_user):
    r = await client.get(f"/teachers/{teacher_user.id}", headers=teacher_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_teacher_profile_self(client, teacher_headers, teacher_user, db_session):
    from app.features.teachers.models import TeacherProfile

    db_session.add(TeacherProfile(user_id=teacher_user.id))
    await db_session.commit()

    r = await client.patch(f"/teachers/{teacher_user.id}", headers=teacher_headers, json={"juz_memorized": 30})
    assert r.status_code == 200
    assert r.json()["juz_memorized"] == 30


@pytest.mark.asyncio
async def test_create_teacher_review(client, student_headers, student_user, teacher_user):
    r = await client.post(
        f"/teachers/{teacher_user.id}/reviews", headers=student_headers,
        json={"rating": 5, "comment": "Excellent teacher"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["rating"] == 5
    assert body["is_admin"] is False
    assert body["reviewer_name"] == f"{student_user.first_name} {student_user.last_name}"


@pytest.mark.asyncio
async def test_create_teacher_review_as_admin_flags_is_admin(client, admin_headers, teacher_user):
    r = await client.post(
        f"/teachers/{teacher_user.id}/reviews", headers=admin_headers,
        json={"rating": 4, "comment": "Solid performance"},
    )
    assert r.status_code == 201
    assert r.json()["is_admin"] is True


@pytest.mark.asyncio
async def test_create_review_invalid_rating_rejected(client, student_headers, teacher_user):
    r = await client.post(
        f"/teachers/{teacher_user.id}/reviews", headers=student_headers,
        json={"rating": 6, "comment": "too high"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_list_teacher_reviews(client, student_headers, teacher_user):
    await client.post(f"/teachers/{teacher_user.id}/reviews", headers=student_headers, json={"rating": 5})
    r = await client.get(f"/teachers/{teacher_user.id}/reviews", headers=student_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


# ─── Session scores ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_teacher_records_own_session_score(client, teacher_headers, teacher_user, student_user, db_session):
    from app.features.sessions.models import TeacherHistory

    db_session.add(TeacherHistory(student_id=student_user.id, teacher_id=teacher_user.id))
    await db_session.commit()

    r = await client.post(
        "/session-scores", headers=teacher_headers,
        json={"student_id": str(student_user.id), "score": 18, "max_score": 20, "surah": "Al-Baqarah"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["teacher_id"] == str(teacher_user.id)
    assert body["score"] == 18


@pytest.mark.asyncio
async def test_teacher_cannot_record_score_for_unallocated_student(client, teacher_headers, teacher_user, student_user):
    r = await client.post(
        "/session-scores", headers=teacher_headers,
        json={"student_id": str(student_user.id), "score": 18, "max_score": 20},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_admin_records_score_requires_teacher_id(client, admin_headers, student_user):
    r = await client.post(
        "/session-scores", headers=admin_headers,
        json={"student_id": str(student_user.id), "score": 15, "max_score": 20},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_admin_records_score_with_explicit_teacher_id(client, admin_headers, teacher_user, student_user):
    r = await client.post(
        "/session-scores", headers=admin_headers,
        json={"student_id": str(student_user.id), "teacher_id": str(teacher_user.id), "score": 20, "max_score": 20},
    )
    assert r.status_code == 201
    assert r.json()["teacher_id"] == str(teacher_user.id)


@pytest.mark.asyncio
async def test_student_cannot_record_session_score(client, student_headers, teacher_user, student_user):
    r = await client.post(
        "/session-scores", headers=student_headers,
        json={"student_id": str(student_user.id), "teacher_id": str(teacher_user.id), "score": 20, "max_score": 20},
    )
    assert r.status_code == 403


# ─── Teacher roster (me/students) ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_teacher_students_roster(client, admin_headers, teacher_headers, teacher_user, student_user):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 2, "duration": 30, "schedule": [],
        },
    )
    r = await client.get("/teachers/me/students", headers=teacher_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["student_id"] == str(student_user.id)


@pytest.mark.asyncio
async def test_teacher_student_session_scores(client, admin_headers, teacher_headers, teacher_user, student_user):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [],
        },
    )
    await client.post(
        "/session-scores", headers=teacher_headers,
        json={"student_id": str(student_user.id), "score": 19, "max_score": 20},
    )
    r = await client.get(f"/teachers/me/students/{student_user.id}/session-scores", headers=teacher_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["score"] == 19


# ─── /teachers/me/stats ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_teacher_stats_requires_teacher(client, student_headers):
    r = await client.get("/teachers/me/stats", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_teacher_stats_empty_roster(client, teacher_headers):
    r = await client.get("/teachers/me/stats", headers=teacher_headers)
    assert r.status_code == 200
    body = r.json()
    assert body == {
        "student_count": 0,
        "sessions_per_week_total": 0,
        "avg_score_pct": None,
        "sessions_attended_total": 0,
    }


@pytest.mark.asyncio
async def test_teacher_stats_reflects_roster_and_scores(
    client, admin_headers, teacher_headers, teacher_user, student_user
):
    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 3, "duration": 30, "schedule": [],
        },
    )
    await client.post(
        "/session-scores", headers=teacher_headers,
        json={"student_id": str(student_user.id), "score": 15, "max_score": 20},
    )

    r = await client.get("/teachers/me/stats", headers=teacher_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["student_count"] == 1
    assert body["sessions_per_week_total"] == 3
    assert body["avg_score_pct"] == pytest.approx(75.0)

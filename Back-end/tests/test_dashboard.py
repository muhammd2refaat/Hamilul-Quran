"""Tests for /dashboard/metrics — aggregate platform stats (admin only)."""
from datetime import date

import pytest


@pytest.mark.asyncio
async def test_dashboard_metrics_requires_admin(client, student_headers):
    r = await client.get("/dashboard/metrics", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_metrics_shape_and_counts(client, admin_headers, admin_user, student_user, teacher_user):
    r = await client.get("/dashboard/metrics", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()

    for key in (
        "total_users", "total_students", "total_teachers", "total_admins",
        "users_by_status", "complaints_by_status", "total_allocations",
        "total_countries", "signups_by_month", "recent_signups",
        "avg_session_score_pct", "score_trend_by_month", "top_teachers_by_score",
        "attendance_both_joined_rate_pct", "attendance_trend_by_week",
        "subscriptions_by_status", "subscriptions_by_plan",
    ):
        assert key in body

    assert body["total_users"] >= 3
    assert body["total_students"] >= 1
    assert body["total_teachers"] >= 1
    assert body["total_admins"] >= 1


@pytest.mark.asyncio
async def test_dashboard_metrics_reflects_allocation_count(client, admin_headers, teacher_user, student_user):
    before = (await client.get("/dashboard/metrics", headers=admin_headers)).json()["total_allocations"]

    await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [],
        },
    )

    after = (await client.get("/dashboard/metrics", headers=admin_headers)).json()["total_allocations"]
    assert after == before + 1


@pytest.mark.asyncio
async def test_dashboard_metrics_months_param_is_bounded(client, admin_headers):
    r = await client.get("/dashboard/metrics?months=999", headers=admin_headers)
    assert r.status_code == 422  # out of the ge=1,le=24 range, not silently clamped by FastAPI


@pytest.mark.asyncio
async def test_dashboard_metrics_reflects_session_scores(
    client, admin_headers, teacher_headers, teacher_user, student_user, db_session
):
    from app.features.sessions.models import TeacherHistory

    db_session.add(TeacherHistory(student_id=student_user.id, teacher_id=teacher_user.id))
    await db_session.commit()

    r = await client.post(
        "/session-scores", headers=teacher_headers,
        json={"student_id": str(student_user.id), "score": 18, "max_score": 20, "surah": "Al-Baqarah"},
    )
    assert r.status_code == 201

    body = (await client.get("/dashboard/metrics", headers=admin_headers)).json()

    assert body["avg_session_score_pct"] == pytest.approx(90.0)
    assert any(pt["count"] >= 1 for pt in body["score_trend_by_month"])
    assert any(
        row["teacher_id"] == str(teacher_user.id) and row["avg_pct"] == pytest.approx(90.0)
        for row in body["top_teachers_by_score"]
    )


@pytest.mark.asyncio
async def test_dashboard_metrics_reflects_subscriptions(client, admin_headers, student_user):
    await client.put(
        f"/subscriptions/{student_user.id}", headers=admin_headers,
        json={"plan_name": "3 sessions/week — Tajweed", "status": "active", "start_date": str(date.today())},
    )

    body = (await client.get("/dashboard/metrics", headers=admin_headers)).json()

    assert body["subscriptions_by_status"].get("active", 0) >= 1
    assert body["subscriptions_by_plan"].get("3 sessions/week — Tajweed", 0) >= 1


@pytest.mark.asyncio
async def test_dashboard_metrics_reflects_attendance(
    client, admin_headers, teacher_headers, student_headers, teacher_user, student_user
):
    alloc = await client.post(
        "/allocations", headers=admin_headers,
        json={
            "teacher_id": str(teacher_user.id), "student_id": str(student_user.id),
            "sessions_per_week": 1, "duration": 30, "schedule": [],
        },
    )
    allocation_id = alloc.json()["id"]
    today = str(date.today())

    for headers in (teacher_headers, student_headers):
        r = await client.post(
            "/sessions/attendance", headers=headers,
            json={
                "allocation_id": allocation_id, "session_date": today,
                "scheduled_day": "mon", "scheduled_time": "10:00",
            },
        )
        assert r.status_code == 201

    body = (await client.get("/dashboard/metrics", headers=admin_headers)).json()

    assert body["attendance_both_joined_rate_pct"] == pytest.approx(100.0)
    assert body["attendance_trend_by_week"]

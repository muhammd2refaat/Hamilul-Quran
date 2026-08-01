"""Tests for /dashboard/metrics — aggregate platform stats (admin only)."""
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

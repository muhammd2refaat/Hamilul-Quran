"""Admin emails for missed / no-show lessons, and teachers viewing their
own lesson ratings (/lesson-reviews/teacher/me)."""
from datetime import datetime, timedelta

import pytest

from app.config.settings import settings
from app.core.email_templates import build_lesson_alert_email
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ
from app.features.sessions import outcomes
from app.features.sessions.models import AttendeeRole, SessionAttendance
from app.features.sessions.outcomes import AttendanceOutcomeService
from app.features.teachers.models import ReviewKind, TeacherReview

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
TODAY = datetime.now(CAIRO_TZ).date()
YESTERDAY = TODAY - timedelta(days=1)
TIME = "10:00 AM"


@pytest.fixture(autouse=True)
def _feature_on(monkeypatch):
    monkeypatch.setattr(settings, "attendance_outcomes_start_date", TODAY - timedelta(days=30))
    monkeypatch.setattr(settings, "attendance_finalize_grace_minutes", 15)
    monkeypatch.setattr(settings, "attendance_notify_admin", True)
    monkeypatch.setattr(settings, "contact_notification_email", "office@example.com")
    monkeypatch.setattr(settings, "admin_url", "https://admin.example.com")


@pytest.fixture
def sent(monkeypatch):
    mails = []

    async def fake_send(to_email, subject, body, html_body=None, priority="normal"):
        mails.append({"to": to_email, "subject": subject, "body": body, "html": html_body, "priority": priority})

    monkeypatch.setattr(outcomes, "send_email", fake_send)
    return mails


async def _allocation(db_session, teacher, student, lesson_date=YESTERDAY):
    allocation = Allocation(
        teacher_id=teacher.id, student_id=student.id, sessions_per_week=1, duration=30,
        schedule=[{"day": DAYS[lesson_date.weekday()], "time": TIME}],
        created_at=datetime.combine(lesson_date - timedelta(days=1), datetime.min.time()),
    )
    db_session.add(allocation)
    await db_session.commit()
    return allocation


async def _joined(db_session, allocation, user, role, session_date=YESTERDAY):
    db_session.add(SessionAttendance(
        allocation_id=allocation.id, user_id=user.id, role=role, session_date=session_date,
        scheduled_day=DAYS[session_date.weekday()], scheduled_time=TIME,
    ))
    await db_session.commit()


# ─── Admin alerts ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_missed_lesson_emails_the_admin(db_session, teacher_user, student_user, sent):
    await _allocation(db_session, teacher_user, student_user)
    await AttendanceOutcomeService(db_session).finalize_due()

    [mail] = sent
    assert mail["to"] == "office@example.com" and mail["priority"] == "high"
    assert mail["subject"] == "[Elhafazah] 1 lesson needs attention"
    assert "Missed — nobody joined" in mail["body"]
    assert teacher_user.first_name in mail["body"] and student_user.first_name in mail["body"]
    assert "https://admin.example.com/attendance" in mail["html"]


@pytest.mark.asyncio
async def test_no_shows_are_labelled_by_who_missed(db_session, teacher_user, student_user, make_user, sent):
    other_student = await make_user(email="second@example.com")
    teacher_came = await _allocation(db_session, teacher_user, student_user)
    student_came = await _allocation(db_session, teacher_user, other_student)
    await _joined(db_session, teacher_came, teacher_user, AttendeeRole.TEACHER)
    await _joined(db_session, student_came, other_student, AttendeeRole.STUDENT)

    await AttendanceOutcomeService(db_session).finalize_due()

    [mail] = sent  # one email for the whole pass
    assert mail["subject"] == "[Elhafazah] 2 lessons need attention"
    assert "Student didn't show up" in mail["body"]
    assert "Teacher didn't show up" in mail["body"]


@pytest.mark.asyncio
async def test_lesson_both_joined_sends_nothing(db_session, teacher_user, student_user, sent):
    allocation = await _allocation(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)
    await _joined(db_session, allocation, student_user, AttendeeRole.STUDENT)

    await AttendanceOutcomeService(db_session).finalize_due()
    assert sent == []


@pytest.mark.asyncio
async def test_each_lesson_is_emailed_once(db_session, teacher_user, student_user, sent):
    await _allocation(db_session, teacher_user, student_user)
    await AttendanceOutcomeService(db_session).finalize_due()
    await AttendanceOutcomeService(db_session).finalize_due()
    assert len(sent) == 1


@pytest.mark.asyncio
async def test_old_lessons_caught_up_on_are_not_emailed(db_session, teacher_user, student_user, sent):
    await _allocation(db_session, teacher_user, student_user, lesson_date=TODAY - timedelta(days=10))
    assert await AttendanceOutcomeService(db_session).finalize_due() >= 1
    assert sent == []


@pytest.mark.asyncio
async def test_alerts_can_be_switched_off(db_session, teacher_user, student_user, sent, monkeypatch):
    monkeypatch.setattr(settings, "attendance_notify_admin", False)
    await _allocation(db_session, teacher_user, student_user)
    await AttendanceOutcomeService(db_session).finalize_due()
    assert sent == []


@pytest.mark.asyncio
async def test_a_failing_email_does_not_break_finalizing(db_session, teacher_user, student_user, monkeypatch):
    async def boom(*args, **kwargs):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(outcomes, "send_email", boom)
    await _allocation(db_session, teacher_user, student_user)
    assert await AttendanceOutcomeService(db_session).finalize_due() == 1


def test_alert_email_escapes_names():
    _, _, html = build_lesson_alert_email([{
        "session_date": YESTERDAY, "scheduled_time": TIME, "teacher_name": "<b>T</b>",
        "student_name": "S", "status": "missed",
    }])
    assert "<b>T</b>" not in html and "&lt;b&gt;T&lt;/b&gt;" in html
    assert "Open Attendance" not in html  # no admin_url → no link


# ─── Teacher's own ratings ──────────────────────────────────────────────────

def _rating(teacher, reviewer, rating, kind=ReviewKind.STUDENT_SESSION, days_ago=1, comment=None):
    return TeacherReview(
        teacher_id=teacher.id, reviewer_id=reviewer.id, reviewer_name=f"{reviewer.first_name} {reviewer.last_name}",
        rating=rating, comment=comment, kind=kind.value, is_admin=kind == ReviewKind.ADMIN_AUDIT,
        session_date=TODAY - timedelta(days=days_ago), scheduled_time=TIME,
    )


@pytest.mark.asyncio
async def test_teacher_sees_their_student_ratings(client, db_session, teacher_headers, teacher_user, student_user, admin_user):
    db_session.add_all([
        _rating(teacher_user, student_user, 5, days_ago=1, comment="Very patient"),
        _rating(teacher_user, student_user, 4, days_ago=8),
        _rating(teacher_user, admin_user, 2, kind=ReviewKind.ADMIN_AUDIT),
    ])
    await db_session.commit()

    r = await client.get("/lesson-reviews/teacher/me", headers=teacher_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2  # admin audits are internal
    assert body["average"] == 4.5
    assert body["distribution"] == {"1": 0, "2": 0, "3": 0, "4": 1, "5": 1}
    newest = body["reviews"][0]
    assert newest["rating"] == 5 and newest["comment"] == "Very patient"
    assert newest["student_name"] == f"{student_user.first_name} {student_user.last_name}"


@pytest.mark.asyncio
async def test_teacher_only_sees_their_own_ratings(client, db_session, teacher_headers, make_user, student_user):
    from app.features.users.models import UserRole

    other_teacher = await make_user(email="other-teacher@example.com", role=UserRole.TEACHER)
    db_session.add(_rating(other_teacher, student_user, 1))
    await db_session.commit()

    body = (await client.get("/lesson-reviews/teacher/me", headers=teacher_headers)).json()
    assert body == {"average": None, "count": 0, "distribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}, "reviews": []}


@pytest.mark.asyncio
async def test_ratings_are_teacher_only(client, student_headers):
    r = await client.get("/lesson-reviews/teacher/me", headers=student_headers)
    assert r.status_code == 403

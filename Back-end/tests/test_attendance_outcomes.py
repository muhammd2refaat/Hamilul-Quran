"""Tests for lesson outcomes (missed / no-show tracking), the session rules
applied when a lesson ends, the admin excuse action, and the tracked /join
link used by calendar invites.

Fixed reference week (Cairo): Monday 2026-11-02, lesson "10:00 AM", 30 min.
"""
import uuid
from datetime import date, datetime, timedelta

import pytest
from sqlmodel import select

from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ
from app.features.sessions.models import AttendeeRole, SessionAttendance, SessionOutcome
from app.features.sessions.outcomes import AttendanceOutcomeService, ended_occurrences
from app.features.subscriptions.models import Subscription, SubscriptionStatus

MONDAY = date(2026, 11, 2)
AFTER_LESSON = datetime(2026, 11, 2, 11, 0, tzinfo=CAIRO_TZ)   # 10:00 + 30 min + 15 grace = 10:45
DURING_LESSON = datetime(2026, 11, 2, 10, 20, tzinfo=CAIRO_TZ)


@pytest.fixture(autouse=True)
def _feature_on(monkeypatch):
    monkeypatch.setattr(settings, "attendance_outcomes_start_date", date(2026, 10, 1))
    monkeypatch.setattr(settings, "attendance_charge_student_no_show", True)
    monkeypatch.setattr(settings, "attendance_finalize_grace_minutes", 15)


async def _setup(db_session, teacher, student, sessions_remaining=4, sub_status=SubscriptionStatus.ACTIVE):
    allocation = Allocation(
        teacher_id=teacher.id, student_id=student.id, sessions_per_week=1, duration=30,
        schedule=[{"day": "mon", "time": "10:00 AM", "meet_link": "https://meet.google.com/abc"}],
        created_at=datetime(2026, 10, 20, 8, 0),
    )
    sub = Subscription(student_id=student.id, plan_name="Plan", status=sub_status,
                       sessions_remaining=sessions_remaining)
    db_session.add_all([allocation, sub])
    await db_session.commit()
    return allocation, sub


async def _joined(db_session, allocation, user, role, consumed=False):
    db_session.add(SessionAttendance(
        allocation_id=allocation.id, user_id=user.id, role=role, session_date=MONDAY,
        scheduled_day="mon", scheduled_time="10:00 AM", consumed_session=consumed,
    ))
    await db_session.commit()


async def _outcome_for(db_session, allocation):
    rows = (await db_session.exec(
        select(SessionOutcome).where(SessionOutcome.allocation_id == allocation.id,
                                     SessionOutcome.session_date == MONDAY)
    )).all()
    assert len(rows) == 1
    return rows[0]


# ─── Which lessons are due ───────────────────────────────────────────────────

def test_a_lesson_is_only_due_after_it_ends_plus_grace():
    allocation = Allocation(teacher_id=uuid.uuid4(), student_id=uuid.uuid4(), duration=30,
                            schedule=[{"day": "mon", "time": "10:00 AM"}],
                            created_at=datetime(2026, 10, 20, 8, 0))
    grace = timedelta(minutes=15)
    due_after = {o.session_date for o in ended_occurrences(allocation, date(2026, 10, 1), AFTER_LESSON, grace)}
    due_during = {o.session_date for o in ended_occurrences(allocation, date(2026, 10, 1), DURING_LESSON, grace)}
    assert MONDAY in due_after
    assert MONDAY not in due_during
    # Mondays before the allocation existed are never included.
    assert date(2026, 10, 19) not in due_after


def test_nothing_before_the_start_date():
    allocation = Allocation(teacher_id=uuid.uuid4(), student_id=uuid.uuid4(), duration=30,
                            schedule=[{"day": "mon", "time": "10:00 AM"}],
                            created_at=datetime(2026, 1, 1))
    due = list(ended_occurrences(allocation, MONDAY, AFTER_LESSON, timedelta(minutes=15)))
    assert [o.session_date for o in due] == [MONDAY]


# ─── Outcomes and session rules ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_both_joined_changes_nothing(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)
    await _joined(db_session, allocation, student_user, AttendeeRole.STUDENT, consumed=True)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    outcome = await _outcome_for(db_session, allocation)
    assert (outcome.status, outcome.session_charge) == ("both", 0)
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4


@pytest.mark.asyncio
async def test_student_no_show_deducts_a_session(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    outcome = await _outcome_for(db_session, allocation)
    assert (outcome.status, outcome.session_charge) == ("teacher_only", 1)
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 3


@pytest.mark.asyncio
async def test_student_no_show_rule_can_be_switched_off(db_session, teacher_user, student_user, monkeypatch):
    monkeypatch.setattr(settings, "attendance_charge_student_no_show", False)
    allocation, sub = await _setup(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    assert (await _outcome_for(db_session, allocation)).session_charge == 0
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4


@pytest.mark.asyncio
async def test_paused_subscription_is_not_charged_for_a_no_show(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, sub_status=SubscriptionStatus.PAUSED)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    assert (await _outcome_for(db_session, allocation)).session_charge == 0
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4


@pytest.mark.asyncio
async def test_teacher_no_show_refunds_the_students_session(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, sessions_remaining=3)
    await _joined(db_session, allocation, student_user, AttendeeRole.STUDENT, consumed=True)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    outcome = await _outcome_for(db_session, allocation)
    assert (outcome.status, outcome.session_charge) == ("student_only", -1)
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4


@pytest.mark.asyncio
async def test_teacher_no_show_never_refunds_a_session_that_was_not_taken(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, sessions_remaining=3)
    await _joined(db_session, allocation, student_user, AttendeeRole.STUDENT, consumed=False)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    assert (await _outcome_for(db_session, allocation)).session_charge == 0
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 3


@pytest.mark.asyncio
async def test_nobody_joined_is_recorded_as_missed(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user)

    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    outcome = await _outcome_for(db_session, allocation)
    assert (outcome.status, outcome.session_charge) == ("missed", 0)


@pytest.mark.asyncio
async def test_finalizing_twice_never_charges_twice(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)
    svc = AttendanceOutcomeService(db_session)

    first = await svc.finalize_due(now=AFTER_LESSON)
    second = await svc.finalize_due(now=AFTER_LESSON)

    assert first >= 1 and second == 0
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 3


@pytest.mark.asyncio
async def test_feature_off_without_a_start_date(db_session, teacher_user, student_user, monkeypatch):
    monkeypatch.setattr(settings, "attendance_outcomes_start_date", None)
    await _setup(db_session, teacher_user, student_user)
    assert await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON) == 0


# ─── Admin: excuse + log ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_excusing_a_no_show_refunds_the_deduction(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user)
    await _joined(db_session, allocation, teacher_user, AttendeeRole.TEACHER)
    svc = AttendanceOutcomeService(db_session)
    await svc.finalize_due(now=AFTER_LESSON)
    outcome = await _outcome_for(db_session, allocation)

    excused = await svc.excuse(outcome.id, "Student was ill")

    assert (excused.status, excused.session_charge, excused.note) == ("excused", 0, "Student was ill")
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4


@pytest.mark.asyncio
async def test_excusing_a_teacher_no_show_keeps_the_refund(db_session, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, sessions_remaining=3)
    await _joined(db_session, allocation, student_user, AttendeeRole.STUDENT, consumed=True)
    svc = AttendanceOutcomeService(db_session)
    await svc.finalize_due(now=AFTER_LESSON)

    await svc.excuse((await _outcome_for(db_session, allocation)).id, None)

    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4


@pytest.mark.asyncio
async def test_admin_log_shows_missed_lessons(client, admin_headers, db_session, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user)
    await AttendanceOutcomeService(db_session).finalize_due(now=AFTER_LESSON)

    r = await client.get("/sessions/attendance", headers=admin_headers)

    assert r.status_code == 200
    row = next(x for x in r.json() if x["allocation_id"] == str(allocation.id) and x["session_date"] == str(MONDAY))
    assert row["status"] == "missed"
    assert row["student_joined_at"] is None and row["teacher_joined_at"] is None


@pytest.mark.asyncio
async def test_excuse_endpoint_is_admin_only(client, teacher_headers):
    r = await client.patch(f"/sessions/attendance/outcomes/{uuid.uuid4()}/excuse", json={}, headers=teacher_headers)
    assert r.status_code == 403


# ─── Join click records whether a session was deducted ───────────────────────

@pytest.mark.asyncio
async def test_student_join_click_records_the_deduction(client, db_session, student_user, student_headers, teacher_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, sessions_remaining=2)
    r = await client.post("/sessions/attendance", headers=student_headers, json={
        "allocation_id": str(allocation.id), "session_date": str(MONDAY),
        "scheduled_day": "mon", "scheduled_time": "10:00 AM",
    })
    assert r.status_code == 201
    row = (await db_session.exec(select(SessionAttendance).where(SessionAttendance.user_id == student_user.id))).first()
    assert row.consumed_session is True
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 1


# ─── Tracked /join link ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_join_link_records_attendance_when_the_lesson_is_open(client, db_session, teacher_user, student_user, student_headers):
    now = datetime.now(CAIRO_TZ)
    starts = (now + timedelta(minutes=5)).replace(second=0, microsecond=0)
    if starts.date() != now.date():
        pytest.skip("too close to midnight for a same-day slot")
    today = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")[now.weekday()]
    allocation = Allocation(
        teacher_id=teacher_user.id, student_id=student_user.id, duration=30,
        schedule=[{"day": today, "time": starts.strftime("%I:%M %p"), "meet_link": "https://meet.google.com/xyz"}],
    )
    db_session.add(allocation)
    await db_session.commit()

    r = await client.post(f"/sessions/attendance/join/{allocation.id}", headers=student_headers)

    assert r.status_code == 200
    assert r.json() == {"recorded": True, "meet_link": "https://meet.google.com/xyz", "reason": None}
    rows = (await db_session.exec(select(SessionAttendance).where(SessionAttendance.allocation_id == allocation.id))).all()
    assert len(rows) == 1 and rows[0].role == AttendeeRole.STUDENT


@pytest.mark.asyncio
async def test_join_link_outside_the_lesson_window_records_nothing(client, db_session, teacher_user, student_user, student_headers):
    now = datetime.now(CAIRO_TZ)
    other_day = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")[(now.weekday() + 3) % 7]
    allocation = Allocation(teacher_id=teacher_user.id, student_id=student_user.id, duration=30,
                            schedule=[{"day": other_day, "time": "10:00 AM", "meet_link": "https://meet.google.com/x"}])
    db_session.add(allocation)
    await db_session.commit()

    r = await client.post(f"/sessions/attendance/join/{allocation.id}", headers=student_headers)

    assert r.json() == {"recorded": False, "meet_link": None, "reason": "not_open"}


@pytest.mark.asyncio
async def test_join_link_rejects_someone_outside_the_lesson(client, db_session, teacher_user, student_user, make_user, auth_headers_for):
    from app.features.users.models import UserRole
    allocation = Allocation(teacher_id=teacher_user.id, student_id=student_user.id, duration=30, schedule=[])
    db_session.add(allocation)
    await db_session.commit()
    stranger = await make_user(role=UserRole.STUDENT)

    r = await client.post(f"/sessions/attendance/join/{allocation.id}", headers=auth_headers_for(stranger))

    assert r.status_code == 403


@pytest.mark.asyncio
async def test_midnight_lesson_can_be_joined_from_1145pm_the_day_before(db_session, teacher_user, student_user):
    from app.features.sessions.service import SessionService
    allocation = Allocation(teacher_id=teacher_user.id, student_id=student_user.id, duration=30,
                            schedule=[{"day": "tue", "time": "12:00 AM", "meet_link": "https://meet.google.com/mid"}])
    db_session.add(allocation)
    await db_session.commit()
    monday_2350 = datetime(2026, 11, 2, 23, 50, tzinfo=CAIRO_TZ)  # Monday 11:50 PM → Tuesday's lesson

    resp = await SessionService(db_session)._join_at(student_user, allocation, monday_2350)

    assert resp.recorded and resp.meet_link == "https://meet.google.com/mid"
    row = (await db_session.exec(select(SessionAttendance).where(SessionAttendance.allocation_id == allocation.id))).first()
    assert row.session_date == date(2026, 11, 3) and row.scheduled_day == "tue"


@pytest.mark.asyncio
async def test_lesson_running_past_midnight_is_still_joinable(db_session, teacher_user, student_user):
    from app.features.sessions.service import SessionService
    allocation = Allocation(teacher_id=teacher_user.id, student_id=student_user.id, duration=60,
                            schedule=[{"day": "mon", "time": "11:30 PM", "meet_link": "https://meet.google.com/late"}])
    db_session.add(allocation)
    await db_session.commit()
    tuesday_0010 = datetime(2026, 11, 3, 0, 10, tzinfo=CAIRO_TZ)

    resp = await SessionService(db_session)._join_at(student_user, allocation, tuesday_0010)

    assert resp.recorded

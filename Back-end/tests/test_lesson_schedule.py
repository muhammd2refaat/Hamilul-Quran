"""Tests for the session-based subscription schedule (end date, deferral,
pause, renewal), the admin "confirm done" action, the allocation preview,
the monthly history, and the Google Calendar series end.

Dates are relative to the real today: the weekly slot is the weekday of
three days ago, so one lesson of it has already ended."""
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlmodel import select

from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ, weekly_rrule
from app.features.sessions.models import AttendeeRole, SessionAttendance, SessionOutcome
from app.features.sessions.outcomes import AttendanceOutcomeService
from app.features.sessions.schedule import ScheduleService
from app.features.subscriptions.models import Subscription, SubscriptionStatus

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
TODAY = datetime.now(CAIRO_TZ).date()
PAST = TODAY - timedelta(days=3)        # a lesson that has ended
DAY = DAYS[PAST.weekday()]
TIME = "10:00 AM"


@pytest.fixture(autouse=True)
def _feature_on(monkeypatch):
    monkeypatch.setattr(settings, "attendance_outcomes_start_date", TODAY - timedelta(days=30))
    monkeypatch.setattr(settings, "attendance_charge_student_no_show", True)
    monkeypatch.setattr(settings, "attendance_finalize_grace_minutes", 15)


async def _setup(db_session, teacher, student, remaining=4, sub_status=SubscriptionStatus.ACTIVE, with_sub=True):
    created = datetime.combine(PAST - timedelta(days=1), datetime.min.time())  # naive UTC, before PAST's lesson
    allocation = Allocation(
        teacher_id=teacher.id, student_id=student.id, sessions_per_week=1, duration=30,
        schedule=[{"day": DAY, "time": TIME}], created_at=created,
    )
    db_session.add(allocation)
    sub = None
    if with_sub:
        sub = Subscription(student_id=student.id, plan_name="1 session/week", status=sub_status,
                           sessions_remaining=remaining)
        db_session.add(sub)
    await db_session.commit()
    return allocation, sub


async def _sync(db_session, student):
    return await ScheduleService(db_session).sync_student(student.id)


async def _outcome(db_session, allocation, session_date=PAST):
    return (await db_session.exec(
        select(SessionOutcome).where(SessionOutcome.allocation_id == allocation.id,
                                     SessionOutcome.session_date == session_date)
    )).one()


# ─── End date ────────────────────────────────────────────────────────────────

def test_rrule_until_is_end_of_the_cairo_day_in_utc():
    assert weekly_rrule("mon") == "RRULE:FREQ=WEEKLY;BYDAY=MO"
    rule = weekly_rrule("mon", date(2026, 11, 30))
    # 23:59:59 Cairo (UTC+2 in November) = 21:59:59Z
    assert rule == "RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261130T215959Z"


@pytest.mark.asyncio
async def test_four_sessions_end_on_the_fourth_weekly_lesson(db_session, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user, remaining=4)
    assert await _sync(db_session, student_user) == PAST + timedelta(days=28)
    await db_session.refresh(allocation)
    assert allocation.scheduled_until == PAST + timedelta(days=28)


@pytest.mark.asyncio
async def test_no_plan_tracked_subscription_is_open_ended(db_session, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user, with_sub=False)
    assert await _sync(db_session, student_user) is None


@pytest.mark.asyncio
async def test_paused_subscription_schedules_nothing(db_session, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user, sub_status=SubscriptionStatus.PAUSED)
    until = await _sync(db_session, student_user)
    assert until is not None and until < PAST + timedelta(days=7)


@pytest.mark.asyncio
async def test_a_missed_lesson_defers_the_session_a_week(db_session, teacher_user, student_user):
    """Nobody joined the last lesson → no session used → the end moves on."""
    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=1)
    # Before the past lesson is finalized, the only paid lesson is next week's.
    assert await _sync(db_session, student_user) == PAST + timedelta(days=7)

    await AttendanceOutcomeService(db_session).finalize_due()
    assert (await _outcome(db_session, allocation)).status == "missed"
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 1
    await db_session.refresh(allocation)
    assert allocation.scheduled_until == PAST + timedelta(days=7)


@pytest.mark.asyncio
async def test_excusing_a_no_show_moves_the_end_a_week(db_session, teacher_user, student_user):
    """4 sessions, 1/week: excusing a charged no-show gives the session
    back, so the last lesson is one week later."""
    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=4)
    db_session.add(SessionAttendance(allocation_id=allocation.id, user_id=teacher_user.id, role=AttendeeRole.TEACHER,
                                     session_date=PAST, scheduled_day=DAY, scheduled_time=TIME))
    await db_session.commit()
    await AttendanceOutcomeService(db_session).finalize_due()
    outcome = await _outcome(db_session, allocation)
    assert outcome.status == "teacher_only" and outcome.session_charge == 1
    await db_session.refresh(allocation)
    assert allocation.scheduled_until == PAST + timedelta(days=21)  # 3 left

    await AttendanceOutcomeService(db_session).excuse(outcome.id, "sick")
    await db_session.refresh(sub)
    await db_session.refresh(allocation)
    assert sub.sessions_remaining == 4
    assert allocation.scheduled_until == PAST + timedelta(days=28)


@pytest.mark.asyncio
async def test_lessons_after_the_last_paid_one_are_not_scheduled(db_session, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user, remaining=0)
    await _sync(db_session, student_user)
    await db_session.refresh(allocation)
    allocation.scheduled_until = PAST - timedelta(days=1)  # ran out before PAST
    db_session.add(allocation)
    await db_session.commit()

    await AttendanceOutcomeService(db_session).finalize_due()
    assert (await _outcome(db_session, allocation)).status == "not_scheduled"


@pytest.mark.asyncio
async def test_renewal_extends_the_end(client, db_session, admin_headers, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=0)
    await _sync(db_session, student_user)
    r = await client.put(f"/subscriptions/{student_user.id}", headers=admin_headers, json={
        "plan_name": "1 session/week", "start_date": TODAY.isoformat(), "sessions_remaining": 4,
    })
    assert r.status_code in (200, 201), r.text
    assert r.json()["ends_on"] == (PAST + timedelta(days=28)).isoformat()


# ─── Confirm done ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_confirm_a_missed_lesson_uses_one_session(client, db_session, admin_headers, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=4)
    await AttendanceOutcomeService(db_session).finalize_due()
    outcome = await _outcome(db_session, allocation)

    r = await client.patch(f"/sessions/attendance/outcomes/{outcome.id}/confirm", headers=admin_headers,
                           json={"note": "Joined from Google Meet directly"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "confirmed"
    assert body["session_charge"] == 1
    assert body["note"] == "Joined from Google Meet directly"
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 3


@pytest.mark.asyncio
async def test_confirm_a_charged_no_show_does_not_charge_twice(client, db_session, admin_headers, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=4)
    db_session.add(SessionAttendance(allocation_id=allocation.id, user_id=teacher_user.id, role=AttendeeRole.TEACHER,
                                     session_date=PAST, scheduled_day=DAY, scheduled_time=TIME))
    await db_session.commit()
    await AttendanceOutcomeService(db_session).finalize_due()
    outcome = await _outcome(db_session, allocation)

    r = await client.patch(f"/sessions/attendance/outcomes/{outcome.id}/confirm", headers=admin_headers, json={})
    assert r.status_code == 200
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 3


@pytest.mark.asyncio
async def test_confirm_teacher_no_show_recharges_the_refund(client, db_session, admin_headers, teacher_user, student_user):
    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=3)
    db_session.add(SessionAttendance(allocation_id=allocation.id, user_id=student_user.id, role=AttendeeRole.STUDENT,
                                     session_date=PAST, scheduled_day=DAY, scheduled_time=TIME, consumed_session=True))
    await db_session.commit()
    await AttendanceOutcomeService(db_session).finalize_due()
    outcome = await _outcome(db_session, allocation)
    assert outcome.status == "student_only" and outcome.session_charge == -1
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 4

    r = await client.patch(f"/sessions/attendance/outcomes/{outcome.id}/confirm", headers=admin_headers, json={})
    assert r.json()["session_charge"] == 0
    await db_session.refresh(sub)
    assert sub.sessions_remaining == 3


@pytest.mark.asyncio
async def test_cannot_confirm_a_lesson_both_joined(client, db_session, admin_headers, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user)
    for user, role in ((teacher_user, AttendeeRole.TEACHER), (student_user, AttendeeRole.STUDENT)):
        db_session.add(SessionAttendance(allocation_id=allocation.id, user_id=user.id, role=role,
                                         session_date=PAST, scheduled_day=DAY, scheduled_time=TIME))
    await db_session.commit()
    await AttendanceOutcomeService(db_session).finalize_due()
    outcome = await _outcome(db_session, allocation)

    r = await client.patch(f"/sessions/attendance/outcomes/{outcome.id}/confirm", headers=admin_headers, json={})
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_confirm_is_admin_only(client, db_session, teacher_headers, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user)
    await AttendanceOutcomeService(db_session).finalize_due()
    outcome = await _outcome(db_session, allocation)
    r = await client.patch(f"/sessions/attendance/outcomes/{outcome.id}/confirm", headers=teacher_headers, json={})
    assert r.status_code == 403


# ─── Allocation preview ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_preview_lists_the_paid_lessons(client, db_session, admin_headers, student_user):
    db_session.add(Subscription(student_id=student_user.id, plan_name="p", sessions_remaining=4))
    await db_session.commit()
    r = await client.post("/allocations/preview", headers=admin_headers, json={
        "student_id": str(student_user.id), "duration": 30, "schedule": [{"day": DAY, "time": TIME}],
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["open_ended"] is False
    assert [l["session_date"] for l in body["lessons"]] == [
        (PAST + timedelta(days=7 * n)).isoformat() for n in range(1, 5)
    ]
    assert body["ends_on"] == (PAST + timedelta(days=28)).isoformat()
    assert sum(m["count"] for m in body["by_month"]) == 4


@pytest.mark.asyncio
async def test_preview_counts_other_allocations_first(client, db_session, admin_headers, teacher_user, student_user):
    """Two weekly slots share the student's 4 sessions."""
    await _setup(db_session, teacher_user, student_user, remaining=4)
    other_day = DAYS[(PAST.weekday() + 1) % 7]
    r = await client.post("/allocations/preview", headers=admin_headers, json={
        "student_id": str(student_user.id), "duration": 30, "schedule": [{"day": other_day, "time": TIME}],
    })
    lessons = r.json()["lessons"]
    assert len(lessons) == 4
    assert sum(l["this_allocation"] for l in lessons) == 2


@pytest.mark.asyncio
async def test_preview_with_no_sessions_left_is_empty(client, db_session, admin_headers, student_user):
    db_session.add(Subscription(student_id=student_user.id, plan_name="p", sessions_remaining=0))
    await db_session.commit()
    r = await client.post("/allocations/preview", headers=admin_headers, json={
        "student_id": str(student_user.id), "duration": 30, "schedule": [{"day": DAY, "time": TIME}],
    })
    body = r.json()
    assert body["lessons"] == [] and body["sessions_remaining"] == 0


@pytest.mark.asyncio
async def test_preview_without_subscription_is_open_ended(client, admin_headers, student_user):
    r = await client.post("/allocations/preview", headers=admin_headers, json={
        "student_id": str(student_user.id), "duration": 30, "schedule": [{"day": DAY, "time": TIME}],
    })
    body = r.json()
    assert body["open_ended"] is True and body["ends_on"] is None and len(body["lessons"]) == 8


# ─── Monthly history ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_monthly_history_counts_and_credits_the_teacher(client, db_session, admin_headers, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user, remaining=4)
    db_session.add(SessionAttendance(allocation_id=allocation.id, user_id=teacher_user.id, role=AttendeeRole.TEACHER,
                                     session_date=PAST, scheduled_day=DAY, scheduled_time=TIME))
    await db_session.commit()

    r = await client.get(f"/sessions/attendance/history?month={PAST.strftime('%Y-%m')}", headers=admin_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    [teacher] = body["teachers"]
    assert teacher["id"] == str(teacher_user.id)
    assert teacher["student_no_show"] == 1
    assert teacher["credited"] == 1  # the teacher came
    assert teacher["scheduled"] == teacher["student_no_show"] + teacher["upcoming"]
    [student] = body["students"]
    assert student["student_no_show"] == 1
    assert student["sessions_remaining"] == 3
    past = [l for l in body["lessons"] if l["session_date"] == PAST.isoformat()]
    assert past[0]["status"] == "teacher_only" and past[0]["teacher_name"]


@pytest.mark.asyncio
async def test_history_survives_deleting_the_allocation(client, db_session, admin_headers, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user)
    await AttendanceOutcomeService(db_session).finalize_due()
    assert (await client.delete(f"/allocations/{allocation.id}", headers=admin_headers)).status_code == 204

    r = await client.get(f"/sessions/attendance/history?month={PAST.strftime('%Y-%m')}", headers=admin_headers)
    [teacher] = r.json()["teachers"]
    assert teacher["missed"] == 1
    log = (await client.get("/sessions/attendance", headers=admin_headers)).json()
    assert any(row["status"] == "missed" for row in log)


@pytest.mark.asyncio
async def test_history_rejects_a_bad_month(client, admin_headers):
    assert (await client.get("/sessions/attendance/history?month=2026-13", headers=admin_headers)).status_code == 422


# ─── Google Calendar series end ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_calendar_series_follows_the_end_date(db_session, teacher_user, student_user, monkeypatch):
    import app.features.allocations.service as alloc_svc

    calls = {"patch": [], "create": []}

    async def fake_token(self, teacher_id):
        return "token"

    async def fake_patch(token, event_id, day, until):
        calls["patch"].append((event_id, until))

    async def fake_create(**kwargs):
        calls["create"].append(kwargs["until"])
        return {"id": "evt-new", "hangoutLink": "https://meet.google.com/new"}

    monkeypatch.setattr(alloc_svc.AllocationService, "_get_teacher_access_token", fake_token)
    monkeypatch.setattr(alloc_svc, "set_event_until", fake_patch)
    monkeypatch.setattr(alloc_svc, "create_weekly_event", fake_create)

    allocation, sub = await _setup(db_session, teacher_user, student_user, remaining=2)
    allocation.schedule = [{"day": DAY, "time": TIME, "google_event_id": "evt-1",
                            "series_start": (PAST - timedelta(days=7)).isoformat()}]
    db_session.add(allocation)
    await db_session.commit()

    await _sync(db_session, student_user)
    assert calls["patch"] == [("evt-1", PAST + timedelta(days=14))]

    # Top-up: the end moves and the same series is extended, not recreated.
    sub.sessions_remaining = 4
    db_session.add(sub)
    await db_session.commit()
    await _sync(db_session, student_user)
    assert calls["patch"][-1] == ("evt-1", PAST + timedelta(days=28))
    assert calls["create"] == []


@pytest.mark.asyncio
async def test_new_allocation_with_no_sessions_gets_no_calendar_event(db_session, teacher_user, student_user, monkeypatch):
    import app.features.allocations.service as alloc_svc

    created = []

    async def fake_token(self, teacher_id):
        return "token"

    async def fake_create(**kwargs):
        created.append(kwargs)
        return {"id": "evt", "hangoutLink": "x"}

    monkeypatch.setattr(alloc_svc.AllocationService, "_get_teacher_access_token", fake_token)
    monkeypatch.setattr(alloc_svc, "create_weekly_event", fake_create)

    db_session.add(Subscription(student_id=student_user.id, plan_name="p", sessions_remaining=0))
    await db_session.commit()
    from app.features.allocations.schemas import AllocationCreate
    await alloc_svc.AllocationService(db_session).create(AllocationCreate(
        teacher_id=teacher_user.id, student_id=student_user.id, sessions_per_week=1, duration=30,
        schedule=[{"day": DAY, "time": TIME}],
    ))
    assert created == []


# ─── Hard delete ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_hard_delete_student_with_attendance_and_outcomes(client, db_session, admin_headers, teacher_user, student_user):
    allocation, _ = await _setup(db_session, teacher_user, student_user)
    db_session.add(SessionAttendance(allocation_id=allocation.id, user_id=student_user.id, role=AttendeeRole.STUDENT,
                                     session_date=PAST, scheduled_day=DAY, scheduled_time=TIME))
    await db_session.commit()
    await AttendanceOutcomeService(db_session).finalize_due()

    r = await client.delete(f"/users/{student_user.id}", headers=admin_headers)
    assert r.status_code in (200, 204), r.text
    left = (await db_session.exec(select(SessionOutcome).where(SessionOutcome.student_id == student_user.id))).all()
    assert left == []


@pytest.mark.asyncio
async def test_history_upcoming_counts_only_paid_lessons(client, db_session, admin_headers, teacher_user, student_user):
    """Two slots on the same day, one session left: one upcoming lesson."""
    future = TODAY + timedelta(days=2)
    if future.month != TODAY.month:
        pytest.skip("needs two days left in the month")
    day = DAYS[future.weekday()]
    db_session.add(Allocation(teacher_id=teacher_user.id, student_id=student_user.id, sessions_per_week=2, duration=30,
                              schedule=[{"day": day, "time": "10:00 AM"}, {"day": day, "time": "11:00 AM"}]))
    db_session.add(Subscription(student_id=student_user.id, plan_name="p", sessions_remaining=1))
    await db_session.commit()

    r = await client.get(f"/sessions/attendance/history?month={TODAY.strftime('%Y-%m')}", headers=admin_headers)
    [student] = r.json()["students"]
    assert student["upcoming"] == 1

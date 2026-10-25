"""
features/sessions/history.py
============================
Monthly lesson history for the admin: per teacher and per student, how
many lessons were scheduled in the month versus how they actually went,
plus each lesson for the breakdown.

Built from lesson outcomes (which keep teacher_id/student_id, so deleted
allocations still count) plus the rest of the month's lessons that are
still ahead, up to each student's last paid lesson.

A teacher's count — what they're credited for — is done lessons (both
joined, or confirmed by an admin) plus student no-shows: the teacher was
there either way.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ, parse_time_str
from app.features.sessions.models import OutcomeStatus, SessionOutcome
from app.features.sessions.schedule import _created, slot_lessons
from app.features.subscriptions.models import Plan, Subscription
from app.features.users.models import User

# Outcome status → the bucket it's counted in.
BUCKET = {
    OutcomeStatus.BOTH.value: "done",
    OutcomeStatus.CONFIRMED.value: "done",
    OutcomeStatus.TEACHER_ONLY.value: "student_no_show",
    OutcomeStatus.STUDENT_ONLY.value: "teacher_no_show",
    OutcomeStatus.MISSED.value: "missed",
    OutcomeStatus.EXCUSED.value: "excused",
    OutcomeStatus.NOT_SCHEDULED.value: "not_scheduled",
}
COUNTED = ("done", "student_no_show", "teacher_no_show", "missed", "excused", "upcoming")


def month_bounds(month: date) -> tuple[date, date]:
    first = month.replace(day=1)
    nxt = (first + timedelta(days=32)).replace(day=1)
    return first, nxt - timedelta(days=1)


def _empty() -> dict:
    return {k: 0 for k in COUNTED + ("not_scheduled",)}


async def monthly_history(session: AsyncSession, month: date, now: Optional[datetime] = None) -> dict:
    first, last = month_bounds(month)
    now_cairo = (now or datetime.now(timezone.utc)).astimezone(CAIRO_TZ)

    lessons: list[dict] = []
    outcomes = (
        await session.exec(
            select(SessionOutcome).where(SessionOutcome.session_date >= first, SessionOutcome.session_date <= last)
        )
    ).all()
    allocations = {a.id: a for a in (await session.exec(select(Allocation))).all()}
    finalized = set()
    for o in outcomes:
        finalized.add((o.allocation_id, o.session_date, o.scheduled_time))
        a = allocations.get(o.allocation_id)
        lessons.append({
            "session_date": o.session_date, "scheduled_time": o.scheduled_time,
            "teacher_id": o.teacher_id or (a.teacher_id if a else None),
            "student_id": o.student_id or (a.student_id if a else None),
            "status": o.status, "bucket": BUCKET.get(o.status, "missed"),
            "outcome_id": o.id, "note": o.note,
        })

    # The rest of the month: lessons still ahead, while they're paid for.
    if last >= now_cairo.date():
        for a in allocations.values():
            for l in slot_lessons(a.id, a.schedule, a.duration, _created(a), now_cairo, 6):
                if not (first <= l.session_date <= last):
                    continue
                if a.scheduled_until is not None and l.session_date > a.scheduled_until:
                    continue
                if (a.id, l.session_date, l.time) in finalized:
                    continue
                lessons.append({
                    "session_date": l.session_date, "scheduled_time": l.time,
                    "teacher_id": a.teacher_id, "student_id": a.student_id,
                    "status": "upcoming", "bucket": "upcoming", "outcome_id": None, "note": None,
                })

    people = {lesson["teacher_id"] for lesson in lessons} | {lesson["student_id"] for lesson in lessons}
    people.discard(None)
    users = {
        u.id: u for u in (await session.exec(select(User).where(User.id.in_(people)))).all()
    } if people else {}

    def name(uid: Optional[uuid.UUID]) -> str:
        u = users.get(uid)
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else "Unknown"

    teachers: dict[uuid.UUID, dict] = {}
    students: dict[uuid.UUID, dict] = {}
    for lesson in lessons:
        lesson["teacher_name"] = name(lesson["teacher_id"])
        lesson["student_name"] = name(lesson["student_id"])
        for key, bucket_map in ((lesson["teacher_id"], teachers), (lesson["student_id"], students)):
            if key is None:
                continue
            row = bucket_map.setdefault(key, {"id": key, "name": name(key), **_empty()})
            row[lesson["bucket"]] += 1

    for row in teachers.values():
        row["scheduled"] = sum(row[k] for k in COUNTED)
        row["credited"] = row["done"] + row["student_no_show"]

    subs = {
        s.student_id: s for s in (
            await session.exec(select(Subscription).where(Subscription.student_id.in_(list(students))))
        ).all()
    } if students else {}
    plans = {p.id: p for p in (await session.exec(select(Plan))).all()}
    ends: dict[uuid.UUID, date] = {}
    for a in allocations.values():
        if a.scheduled_until is not None:
            ends[a.student_id] = max(ends.get(a.student_id, a.scheduled_until), a.scheduled_until)
    for sid, row in students.items():
        row["scheduled"] = sum(row[k] for k in COUNTED)
        sub = subs.get(sid)
        plan = plans.get(sub.plan_id) if sub and sub.plan_id else None
        row["plan_name"] = sub.plan_name if sub else None
        row["sessions_per_week"] = plan.sessions_per_week if plan else None
        row["sessions_remaining"] = sub.sessions_remaining if sub else None
        row["ends_on"] = ends.get(sid)

    lessons.sort(key=lambda l: (l["session_date"], parse_time_str(l["scheduled_time"])))
    for lesson in lessons:
        lesson.pop("bucket")
    return {
        "month": first.strftime("%Y-%m"),
        "teachers": sorted(teachers.values(), key=lambda r: r["name"].lower()),
        "students": sorted(students.values(), key=lambda r: r["name"].lower()),
        "lessons": lessons,
    }

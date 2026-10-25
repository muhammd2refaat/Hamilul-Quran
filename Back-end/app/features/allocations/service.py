import logging
import uuid
from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.config.settings import settings
from app.features.allocations.models import Allocation
from app.features.allocations.schemas import AllocationCreate, AllocationUpdate
from app.features.auth.models import GoogleCredential
from app.features.calendar.google_calendar_client import (
    create_weekly_event,
    delete_event,
    get_valid_access_token,
    has_calendar_access,
    next_occurrence,
    set_event_until,
)
from app.features.sessions.models import SessionAttendance
from app.features.sessions.schedule import ScheduleService
from app.features.sessions.service import SessionService
from app.features.users.models import User

logger = logging.getLogger(__name__)


def _lesson_description(allocation_id: uuid.UUID) -> str:
    """Calendar-invite body. Google always shows its own "Join with Google
    Meet" button too — this link is the one that records attendance, so it
    goes first, in both languages."""
    join_url = f"{settings.frontend_url}/join/{allocation_id}"
    return (
        "Elhafazah Academy — weekly Qur'an lesson.\n\n"
        f"Join here so your attendance is recorded:\n{join_url}\n\n"
        "Joining with the Google Meet button below works too, but your "
        "attendance won't be counted.\n\n"
        "أكاديمية الحفظة — حلقة قرآن أسبوعية.\n\n"
        f"انضم من هذا الرابط حتى يُسجَّل حضورك:\n{join_url}\n\n"
        "يمكنك الانضمام عبر زر Google Meet أيضاً، لكن لن يُحتسب حضورك."
    )

class AllocationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.sessions = SessionService(session=session)

    async def get_all(self) -> list[Allocation]:
        query = select(Allocation).order_by(Allocation.created_at.desc())
        result = await self.session.exec(query)
        return result.all()

    async def get_user_allocations(self, user_id: uuid.UUID, role: str) -> list[Allocation]:
        from app.features.users.models import UserRole
        if role == UserRole.STUDENT:
            query = select(Allocation).where(Allocation.student_id == user_id).order_by(Allocation.created_at.desc())
        elif role == UserRole.TEACHER:
            query = select(Allocation).where(Allocation.teacher_id == user_id).order_by(Allocation.created_at.desc())
        else:
            return []
        result = await self.session.exec(query)
        return result.all()

    async def create(self, body: AllocationCreate) -> Allocation:
        # Convert schema to DB model
        allocation = Allocation(
            teacher_id=body.teacher_id,
            student_id=body.student_id,
            sessions_per_week=body.sessions_per_week,
            duration=body.duration,
            schedule=[s.model_dump() for s in body.schedule]
        )
        self.session.add(allocation)

        # An allocation is the assignment event — record it in teacher_history
        # too, closing out any previously-open assignment for this student.
        await self.sessions.reassign_teacher(body.student_id, body.teacher_id)

        await self.session.commit()
        await self.session.refresh(allocation)

        # Sets scheduled_until from the student's remaining sessions and
        # creates the calendar series ending there.
        await ScheduleService(self.session).sync_student(allocation.student_id, create_missing=True)
        await self.session.refresh(allocation)

        return allocation

    async def get_by_id(self, allocation_id: uuid.UUID) -> Allocation:
        allocation = await self.session.get(Allocation, allocation_id)
        if not allocation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found"
            )
        return allocation

    async def update(self, allocation_id: uuid.UUID, body: AllocationUpdate) -> Allocation:
        allocation = await self.get_by_id(allocation_id)
        update_data = body.model_dump(exclude_unset=True)

        schedule_changed = "schedule" in update_data and update_data["schedule"] is not None
        old_teacher_id = allocation.teacher_id
        old_student_id = allocation.student_id
        old_schedule = list(allocation.schedule or []) if schedule_changed else None

        if schedule_changed:
            update_data["schedule"] = [
                s if isinstance(s, dict) else dict(s) for s in update_data["schedule"]
            ]

        for field, value in update_data.items():
            setattr(allocation, field, value)
        self.session.add(allocation)

        await self.session.commit()
        await self.session.refresh(allocation)

        if schedule_changed:
            # Best-effort: drop the old Meet events on the (possibly former)
            # teacher's calendar; the sync below creates fresh ones for the
            # new schedule.
            await self._try_delete_calendar_events(old_teacher_id, old_schedule)

        schedule = ScheduleService(self.session)
        await schedule.sync_student(allocation.student_id, create_missing=True)
        if old_student_id != allocation.student_id:
            await schedule.sync_student(old_student_id)
        await self.session.refresh(allocation)
        return allocation

    async def delete(self, allocation_id: uuid.UUID) -> None:
        allocation = await self.get_by_id(allocation_id)
        await self._try_delete_calendar_events(allocation.teacher_id, allocation.schedule)

        # session_attendance.allocation_id is a foreign key with no cascade —
        # any recorded Join-button click for this allocation would otherwise
        # block the delete below with a 23503 foreign_key_violation. Scoped
        # to this allocation_id only, so other allocations' attendance
        # history is untouched.
        attendance_result = await self.session.exec(
            select(SessionAttendance).where(SessionAttendance.allocation_id == allocation_id)
        )
        for record in attendance_result.all():
            await self.session.delete(record)
        # Lesson outcomes are kept: they carry teacher_id/student_id and are
        # the monthly history (teacher totals), which outlives the allocation.
        # Flush now, separately from the allocation delete below: SQLModel
        # declares this as a plain foreign_key with no ORM relationship(), so
        # SQLAlchemy's flush has no dependency graph telling it these rows
        # must go first — without this, both deletes can land in the same
        # flush in the wrong order and still hit the FK constraint.
        await self.session.flush()

        await self.session.delete(allocation)
        await self.session.commit()
        # The student's other allocations may now have lessons to spare.
        await ScheduleService(self.session).sync_student(allocation.student_id)

    async def _try_delete_calendar_events(
        self, teacher_id: uuid.UUID, schedule: list[dict] | None
    ) -> None:
        """Best-effort: delete any Google Calendar events tied to `schedule`
        entries on the teacher's calendar. Never raises."""
        try:
            access_token = await self._get_teacher_access_token(teacher_id)
            if not access_token:
                return
            for entry in schedule or []:
                await self._delete_event_for_entry(access_token, entry)
        except Exception:
            logger.warning(
                "Google Calendar cleanup failed for teacher %s", teacher_id, exc_info=True,
            )

    @staticmethod
    async def _delete_event_for_entry(access_token: str, entry: dict) -> None:
        event_id = entry.get("google_event_id")
        if not event_id:
            return
        try:
            await delete_event(access_token, event_id)
        except Exception:
            logger.warning(
                "Failed to delete Google Calendar event %s", event_id, exc_info=True,
            )

    async def apply_schedule_end(
        self, allocation: Allocation, old_until: Optional[date], today: date
    ) -> None:
        """
        Best-effort: bring the teacher's calendar in line with the
        allocation's scheduled_until — end the series on the last paid
        lesson, extend it after a renewal or deferral, and create events for
        slots that have none (e.g. the subscription had run out when the
        allocation was made). A series that had already ended in the past is
        recreated from now rather than extended, so the old weeks with no
        lesson don't reappear on the calendar. Never raises.
        """
        try:
            access_token = await self._get_teacher_access_token(allocation.teacher_id)
            if not access_token:
                return
            until = allocation.scheduled_until
            restart = old_until is not None and old_until < today and (until is None or until > old_until)

            slots = []
            for entry in allocation.schedule or []:
                entry = dict(entry)
                event_id = entry.get("google_event_id")
                if event_id:
                    series_start = entry.get("series_start")
                    starts_after_end = (
                        until is not None and series_start is not None
                        and until < date.fromisoformat(series_start)
                    )
                    if restart or starts_after_end:
                        await self._delete_event_for_entry(access_token, entry)
                        for key in ("google_event_id", "meet_link", "series_start"):
                            entry.pop(key, None)
                    else:
                        await set_event_until(access_token, event_id, entry["day"], until)
                slots.append(entry)

            # Reassign (not in-place mutate) so SQLAlchemy detects the JSON change.
            allocation.schedule = slots
            self.session.add(allocation)
            await self.session.commit()
            await self._try_create_calendar_events(allocation)
        except Exception:
            logger.warning(
                "Google Calendar schedule-end sync failed for allocation %s", allocation.id, exc_info=True
            )

    async def _try_create_calendar_events(self, allocation: Allocation) -> None:
        """
        Best-effort: create one real, weekly-recurring Google Calendar event
        (with an auto-generated Meet link) per schedule entry, on the
        teacher's connected Google Calendar, inviting the student by email.

        Never raises — if the teacher has no connected Google account, or
        anything about the Google API call fails, the allocation itself has
        already been created successfully and this is simply skipped.
        """
        try:
            access_token = await self._get_teacher_access_token(allocation.teacher_id)
            if not access_token:
                return

            teacher, student = await self._load_allocation_users(allocation)
            if teacher is None or student is None:
                return

            enriched_schedule = await self._build_enriched_schedule(
                access_token, allocation, teacher, student
            )

            # Reassign (not in-place mutate) so SQLAlchemy detects the JSON change.
            allocation.schedule = enriched_schedule
            self.session.add(allocation)
            await self.session.commit()
        except Exception:
            logger.warning(
                "Google Calendar sync failed for allocation %s", allocation.id, exc_info=True
            )

    async def _get_teacher_access_token(self, teacher_id: uuid.UUID) -> str | None:
        cred_result = await self.session.exec(
            select(GoogleCredential).where(GoogleCredential.user_id == teacher_id)
        )
        credential = cred_result.first()
        # A teacher who signed in but hasn't clicked "Connect Google Calendar"
        # has a basic-identity credential only — skip rather than call the
        # Calendar API and log a 403.
        if not has_calendar_access(credential):
            return None
        return await get_valid_access_token(self.session, credential)

    async def backfill_calendar_events(self, teacher_id: uuid.UUID) -> int:
        """
        Create Google Calendar events for this teacher's allocations that were
        made before they connected their calendar. Allocations that already
        have an event are left alone, so running this twice never duplicates.
        Returns how many allocations were synced.
        """
        result = await self.session.exec(
            select(Allocation).where(Allocation.teacher_id == teacher_id)
        )
        synced = 0
        for allocation in result.all():
            slots = allocation.schedule or []
            if any(isinstance(s, dict) and s.get("google_event_id") for s in slots):
                continue
            await self._try_create_calendar_events(allocation)
            synced += 1
        return synced

    async def _load_allocation_users(
        self, allocation: Allocation
    ) -> tuple[User | None, User | None]:
        users_result = await self.session.exec(
            select(User).where(User.id.in_([allocation.teacher_id, allocation.student_id]))
        )
        users_by_id = {u.id: u for u in users_result.all()}
        return users_by_id.get(allocation.teacher_id), users_by_id.get(allocation.student_id)

    async def _build_enriched_schedule(
        self, access_token: str, allocation: Allocation, teacher: User, student: User
    ) -> list[dict]:
        student_name = f"{student.first_name} {student.last_name}".strip() or student.email
        teacher_name = f"{teacher.first_name} {teacher.last_name}".strip() or teacher.email

        enriched_schedule = []
        until = allocation.scheduled_until
        for entry in allocation.schedule:
            enriched_entry = dict(entry)
            day = entry.get("day")
            time_str = entry.get("time")
            # Slots that already have a series, or whose next lesson is past
            # the last paid one (no sessions left), get no new event.
            if entry.get("google_event_id") or not (day and time_str):
                enriched_schedule.append(enriched_entry)
                continue
            first_lesson = next_occurrence(day, time_str)
            if until is not None and first_lesson.date() > until:
                enriched_schedule.append(enriched_entry)
                continue
            if day and time_str:
                event = await self._create_event_for_slot(
                    access_token, allocation, teacher, student,
                    teacher_name, student_name, day, time_str,
                )
                if event:
                    enriched_entry["meet_link"] = event.get("hangoutLink")
                    enriched_entry["google_event_id"] = event.get("id")
                    enriched_entry["series_start"] = first_lesson.date().isoformat()
            enriched_schedule.append(enriched_entry)
        return enriched_schedule

    async def _create_event_for_slot(
        self,
        access_token: str,
        allocation: Allocation,
        teacher: User,
        student: User,
        teacher_name: str,
        student_name: str,
        day: str,
        time_str: str,
    ) -> dict | None:
        try:
            attendee_emails = [teacher.email, student.email]
            # Optional third attendee so the academy's own account sees every
            # lesson too — the teacher's connected Google account still owns
            # the event; this only adds a guest. Skipped when unset (e.g. on
            # staging, so test allocations don't spam the real inbox) or when
            # it's already one of the two (a teacher/student account happens
            # to be the notify address itself — avoids a duplicate-attendee
            # entry Google may reject).
            notify_email = settings.calendar_notify_email.strip().lower()
            if notify_email and notify_email not in {e.lower() for e in attendee_emails}:
                attendee_emails.append(settings.calendar_notify_email)

            return await create_weekly_event(
                access_token=access_token,
                summary=f"Qur'an session — {student_name} with {teacher_name}",
                description=_lesson_description(allocation.id),
                attendee_emails=attendee_emails,
                day=day,
                time_str=time_str,
                duration_minutes=allocation.duration,
                until=allocation.scheduled_until,
            )
        except Exception:
            logger.warning(
                "Google Calendar event creation failed for allocation %s (day=%s time=%s)",
                allocation.id, day, time_str, exc_info=True,
            )
            return None

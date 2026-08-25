import logging
import uuid
from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from app.features.allocations.models import Allocation
from app.features.allocations.schemas import AllocationCreate, AllocationUpdate
from app.features.auth.models import GoogleCredential
from app.features.calendar.google_calendar_client import (
    create_weekly_event,
    delete_event,
    get_valid_access_token,
)
from app.features.sessions.models import SessionAttendance
from app.features.sessions.service import SessionService
from app.features.users.models import User

logger = logging.getLogger(__name__)

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

        await self._try_create_calendar_events(allocation)

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
            # teacher's calendar, then generate fresh ones for the new schedule.
            await self._try_delete_calendar_events(old_teacher_id, old_schedule)
            await self._try_create_calendar_events(allocation)

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
        # Flush now, separately from the allocation delete below: SQLModel
        # declares this as a plain foreign_key with no ORM relationship(), so
        # SQLAlchemy's flush has no dependency graph telling it these rows
        # must go first — without this, both deletes can land in the same
        # flush in the wrong order and still hit the FK constraint.
        await self.session.flush()

        await self.session.delete(allocation)
        await self.session.commit()

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
        if credential is None:
            return None
        return await get_valid_access_token(self.session, credential)

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
        for entry in allocation.schedule:
            enriched_entry = dict(entry)
            day = entry.get("day")
            time_str = entry.get("time")
            if day and time_str:
                event = await self._create_event_for_slot(
                    access_token, allocation, teacher, student,
                    teacher_name, student_name, day, time_str,
                )
                if event:
                    enriched_entry["meet_link"] = event.get("hangoutLink")
                    enriched_entry["google_event_id"] = event.get("id")
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
            return await create_weekly_event(
                access_token=access_token,
                summary=f"Qur'an session — {student_name} with {teacher_name}",
                description="Hamilul-Quran recurring lesson, scheduled via the platform.",
                attendee_emails=[teacher.email, student.email],
                day=day,
                time_str=time_str,
                duration_minutes=allocation.duration,
            )
        except Exception:
            logger.warning(
                "Google Calendar event creation failed for allocation %s (day=%s time=%s)",
                allocation.id, day, time_str, exc_info=True,
            )
            return None

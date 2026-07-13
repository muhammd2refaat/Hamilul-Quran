import logging
import secrets
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import delete as sql_delete, func
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.config.settings import settings
from app.core.security import hash_password
from app.features.users.models import User, UserRole, UserStatus
from app.features.users.schemas import UserCreate, UserUpdate

logger = logging.getLogger(__name__)

# Columns the CMS is allowed to sort users by.
_SORTABLE_COLUMNS = {
    "created_at": User.created_at,
    "joined_date": User.joined_date,
    "email": User.email,
    "first_name": User.first_name,
    "last_name": User.last_name,
    "status": User.status,
    "role": User.role,
    "country": User.country,
}


class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        status_filter: Optional[UserStatus] = None,
        country: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[User], int]:
        query = select(User)
        count_query = select(func.count()).select_from(User)

        if search:
            like = f"%{search}%"
            search_clause = (
                (User.email.ilike(like)) |
                (User.first_name.ilike(like)) |
                (User.last_name.ilike(like))
            )
            query = query.where(search_clause)
            count_query = count_query.where(search_clause)

        if role is not None:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)

        if status_filter is not None:
            query = query.where(User.status == status_filter)
            count_query = count_query.where(User.status == status_filter)

        if country:
            query = query.where(User.country == country)
            count_query = count_query.where(User.country == country)

        total_result = await self.session.exec(count_query)
        total = total_result.one()

        sort_column = _SORTABLE_COLUMNS.get(sort_by, User.created_at)
        order_clause = sort_column.asc() if sort_order == "asc" else sort_column.desc()
        query = query.order_by(order_clause).limit(limit).offset(offset)
        result = await self.session.exec(query)
        return result.all(), total

    async def get_by_id(self, user_id: uuid.UUID) -> User:
        result = await self.session.exec(select(User).where(User.id == user_id))
        user = result.first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    async def create(self, data: UserCreate) -> User:
        # Check uniqueness
        existing = await self.session.exec(
            select(User).where(User.email == data.email)
        )
        if existing.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{data.email}' is already registered",
            )
            
        # If teacher_id is provided, verify the teacher exists and has TEACHER role
        if data.teacher_id:
            teacher = await self.session.get(User, data.teacher_id)
            if not teacher or teacher.role != UserRole.TEACHER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid teacher_id or the referenced user is not a teacher",
                )

        # Admin-created users (e.g. via the CMS) may omit a password —
        # generate a random temporary one; they can reset it later.
        password = data.password or secrets.token_urlsafe(16)

        user = User(
            email=data.email,
            username=data.username,
            first_name=data.first_name,
            last_name=data.last_name,
            password_hash=hash_password(password),
            role=data.role,
            status=UserStatus.ACTIVE,
            phone_number=data.phone_number,
            country=data.country,
            city=data.city,
            gender=data.gender,
            date_of_birth=data.date_of_birth,
            teacher_id=data.teacher_id,
        )
        self.session.add(user)
        await self.session.flush()

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update(self, user_id: uuid.UUID, data: UserUpdate) -> User:
        user = await self.get_by_id(user_id)
        update_data = data.model_dump(exclude_unset=True)
        
        if "teacher_id" in update_data and update_data["teacher_id"] is not None:
            teacher = await self.session.get(User, update_data["teacher_id"])
            if not teacher or teacher.role != UserRole.TEACHER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid teacher_id or the referenced user is not a teacher",
                )
        
        for field, value in update_data.items():
            setattr(user, field, value)
        self.session.add(user)

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete(self, user_id: uuid.UUID) -> None:
        """
        Hard-delete a user and every row that references them: teacher
        profile/ijazas/reviews, session scores, teacher history, allocations
        (best-effort Google Calendar cleanup first), complaints, requests,
        Google credentials, subscriptions, and receipts (+ their files on
        disk). Other students pointing at a deleted teacher have their
        `teacher_id` cleared rather than being deleted themselves.
        """
        # Local imports to avoid import cycles between feature modules.
        from app.features.allocations.models import Allocation
        from app.features.auth.models import GoogleCredential
        from app.features.complaints.models import Complaint
        from app.features.requests.models import PlatformRequest
        from app.features.sessions.models import SessionScore, TeacherHistory
        from app.features.teachers.models import Ijaza, TeacherProfile, TeacherReview

        user = await self.get_by_id(user_id)

        # ── Allocations: best-effort delete any Google Calendar events first ──
        alloc_result = await self.session.exec(
            select(Allocation).where(
                (Allocation.teacher_id == user_id) | (Allocation.student_id == user_id)
            )
        )
        allocations = alloc_result.all()
        if allocations:
            await self._try_delete_calendar_events(allocations)
            for allocation in allocations:
                await self.session.delete(allocation)

        # ── Teacher profile + ijazas (if this user is a teacher) ──
        profile_result = await self.session.exec(
            select(TeacherProfile).where(TeacherProfile.user_id == user_id)
        )
        profile = profile_result.first()
        if profile:
            await self.session.exec(
                sql_delete(Ijaza).where(Ijaza.teacher_profile_id == profile.id)
            )
            await self.session.delete(profile)

        await self.session.exec(
            sql_delete(TeacherReview).where(
                (TeacherReview.teacher_id == user_id) | (TeacherReview.reviewer_id == user_id)
            )
        )
        await self.session.exec(
            sql_delete(SessionScore).where(
                (SessionScore.student_id == user_id) | (SessionScore.teacher_id == user_id)
            )
        )
        await self.session.exec(
            sql_delete(TeacherHistory).where(
                (TeacherHistory.student_id == user_id) | (TeacherHistory.teacher_id == user_id)
            )
        )
        await self.session.exec(
            sql_delete(Complaint).where(
                (Complaint.user_id == user_id) | (Complaint.about_id == user_id)
            )
        )
        await self.session.exec(
            sql_delete(PlatformRequest).where(PlatformRequest.user_id == user_id)
        )
        await self.session.exec(
            sql_delete(GoogleCredential).where(GoogleCredential.user_id == user_id)
        )

        # ── Subscriptions + receipts (their files too) ──
        try:
            from app.features.subscriptions.models import Subscription
            await self.session.exec(
                sql_delete(Subscription).where(Subscription.student_id == user_id)
            )
        except ImportError:
            pass

        try:
            from app.features.receipts.models import Receipt
            receipts_result = await self.session.exec(
                select(Receipt).where(Receipt.student_id == user_id)
            )
            receipts = receipts_result.all()
            for receipt in receipts:
                self._delete_file_best_effort(receipt.file_path)
            await self.session.exec(sql_delete(Receipt).where(Receipt.student_id == user_id))
        except ImportError:
            pass

        # ── Null out other students' teacher_id if this user was their teacher ──
        students_result = await self.session.exec(
            select(User).where(User.teacher_id == user_id)
        )
        for student in students_result.all():
            student.teacher_id = None
            self.session.add(student)

        await self.session.delete(user)
        await self.session.commit()

    async def _try_delete_calendar_events(self, allocations: list) -> None:
        """Best-effort: delete any Google Calendar events tied to these
        allocations' schedules. Never raises — the DB delete must proceed
        regardless of Google API outcomes."""
        teacher_ids = {a.teacher_id for a in allocations}
        for teacher_id in teacher_ids:
            teacher_allocations = [a for a in allocations if a.teacher_id == teacher_id]
            await self._try_delete_teacher_calendar_events(teacher_id, teacher_allocations)

    async def _try_delete_teacher_calendar_events(
        self, teacher_id: uuid.UUID, allocations: list
    ) -> None:
        from app.features.auth.models import GoogleCredential
        from app.features.calendar.google_calendar_client import get_valid_access_token

        try:
            cred_result = await self.session.exec(
                select(GoogleCredential).where(GoogleCredential.user_id == teacher_id)
            )
            credential = cred_result.first()
            if credential is None:
                return
            access_token = await get_valid_access_token(self.session, credential)
            if not access_token:
                return
            for allocation in allocations:
                await self._delete_allocation_calendar_events(access_token, allocation)
        except Exception:
            logger.warning(
                "Google Calendar cleanup failed for teacher %s", teacher_id, exc_info=True,
            )

    @staticmethod
    async def _delete_allocation_calendar_events(access_token: str, allocation) -> None:
        from app.features.calendar.google_calendar_client import delete_event

        for entry in allocation.schedule or []:
            event_id = entry.get("google_event_id")
            if not event_id:
                continue
            try:
                await delete_event(access_token, event_id)
            except Exception:
                logger.warning(
                    "Failed to delete Google Calendar event %s", event_id, exc_info=True,
                )

    @staticmethod
    def _delete_file_best_effort(relative_path: Optional[str]) -> None:
        if not relative_path:
            return
        try:
            path = Path(settings.upload_dir) / relative_path
            if path.is_file():
                path.unlink()
        except Exception:
            logger.warning("Failed to delete file %s", relative_path, exc_info=True)

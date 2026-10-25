import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Sequence

from fastapi import HTTPException, UploadFile, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config.settings import settings
from app.core.storage import save_certificate
from app.features.allocations.models import Allocation
from app.features.calendar.google_calendar_client import CAIRO_TZ
from app.features.sessions.models import SessionAttendance, SessionScore
from app.features.teachers.models import Ijaza, IjazaType, ReviewKind, TeacherProfile, TeacherReview
from app.features.teachers.schemas import (
    IjazaResponse,
    LessonReviewCreate,
    PaginatedTeachers,
    ReviewableLesson,
    TeacherProfileResponse,
    TeacherProfileUpdate,
    TeacherPublicResponse,
    TeacherReviewCreate,
    TeacherReviewResponse,
    TeacherStudentResponse,
)
from app.features.users.models import User, UserRole



class TeacherService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all_teachers(
        self, limit: int = 20, offset: int = 0
    ) -> PaginatedTeachers:
        """Paginated public list of all teacher profiles."""
        # Total count
        count_result = await self.session.exec(select(func.count()).select_from(TeacherProfile))
        total = count_result.one()

        # Fetch profiles + users
        query = (
            select(TeacherProfile, User)
            .join(User, TeacherProfile.user_id == User.id)
            .offset(offset)
            .limit(limit)
            .order_by(TeacherProfile.created_at.desc())
        )
        result = await self.session.exec(query)
        rows = result.all()

        items: list[TeacherPublicResponse] = []
        for profile, user in rows:
            items.append(await self._build_public_response(profile, user))

        return PaginatedTeachers(items=items, total=total, limit=limit, offset=offset)

    async def get_public_profile(self, user_id: uuid.UUID) -> TeacherPublicResponse:
        """Public-safe profile for any teacher, accessible by any authenticated user."""
        profile = await self._get_profile_row(user_id)
        result = await self.session.exec(select(User).where(User.id == user_id))
        user = result.first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
        return await self._build_public_response(profile, user)

    async def _build_public_response(
        self, profile: TeacherProfile, user: User
    ) -> TeacherPublicResponse:
        ijazas_result = await self.session.exec(
            select(Ijaza).where(Ijaza.teacher_profile_id == profile.id)
        )
        ijazas = [IjazaResponse.model_validate(i) for i in ijazas_result.all()]

        reviews_result = await self.session.exec(
            select(TeacherReview).where(TeacherReview.teacher_id == user.id)
        )
        reviews = reviews_result.all()
        avg = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else None

        full_name = f"{user.first_name} {user.last_name}".strip() or user.email
        return TeacherPublicResponse(
            user_id=user.id,
            full_name=full_name,
            juz_memorized=profile.juz_memorized,
            ijazas=ijazas,
            average_rating=avg,
            review_count=len(reviews),
        )


    async def create_profile(
        self,
        user_id: uuid.UUID,
        worked_online_before: bool,
        juz_memorized: Optional[int],
        ijazas: Sequence[IjazaType],
        certificate: Optional[UploadFile] = None,
    ) -> TeacherProfile:
        """
        Create a teacher's profile plus one Ijaza row per held ijaza, saving an
        optional certificate file to local storage.

        Adds rows to the session but does NOT commit — the caller owns the
        transaction (so user + profile + credentials commit atomically).
        """
        certificate_path = None
        if certificate is not None and certificate.filename:
            certificate_path = await save_certificate(certificate)

        profile = TeacherProfile(
            user_id=user_id,
            worked_online_before=worked_online_before,
            juz_memorized=juz_memorized,
            certificate_path=certificate_path,
        )
        self.session.add(profile)
        await self.session.flush()  # populate profile.id for the FK below

        for ijaza_type in ijazas:
            self.session.add(
                Ijaza(teacher_profile_id=profile.id, ijaza_type=ijaza_type)
            )

        return profile

    async def _get_profile_row(self, user_id: uuid.UUID) -> TeacherProfile:
        result = await self.session.exec(
            select(TeacherProfile).where(TeacherProfile.user_id == user_id)
        )
        profile = result.first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found"
            )
        return profile

    async def get_profile(self, user_id: uuid.UUID) -> TeacherProfileResponse:
        profile = await self._get_profile_row(user_id)
        ijazas_result = await self.session.exec(
            select(Ijaza).where(Ijaza.teacher_profile_id == profile.id)
        )
        ijazas = ijazas_result.all()

        return TeacherProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            worked_online_before=profile.worked_online_before,
            juz_memorized=profile.juz_memorized,
            certificate_path=profile.certificate_path,
            ijazas=[IjazaResponse.model_validate(i) for i in ijazas],
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )

    async def update_profile(
        self, user_id: uuid.UUID, data: TeacherProfileUpdate
    ) -> TeacherProfileResponse:
        profile = await self._get_profile_row(user_id)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        self.session.add(profile)
        await self.session.commit()
        await self.session.refresh(profile)
        return await self.get_profile(user_id)

    async def list_my_students(self, teacher_id: uuid.UUID) -> list[TeacherStudentResponse]:
        """All students currently allocated to this teacher, with a snapshot of
        each student's most recent session score."""
        query = (
            select(Allocation, User)
            .join(User, Allocation.student_id == User.id)
            .where(Allocation.teacher_id == teacher_id)
            .order_by(Allocation.created_at.desc())
        )
        result = await self.session.exec(query)
        rows = result.all()

        out: list[TeacherStudentResponse] = []
        for alloc, student in rows:
            scores_query = (
                select(SessionScore)
                .where(SessionScore.student_id == student.id)
                .where(SessionScore.teacher_id == teacher_id)
                .order_by(SessionScore.date.desc())
                .limit(1)
            )
            scores_result = await self.session.exec(scores_query)
            last = scores_result.first()

            out.append(
                TeacherStudentResponse(
                    allocation_id=alloc.id,
                    student_id=student.id,
                    first_name=student.first_name,
                    last_name=student.last_name,
                    email=student.email,
                    sessions_per_week=alloc.sessions_per_week,
                    duration=alloc.duration,
                    schedule=alloc.schedule,
                    last_score=last.score if last else None,
                    last_max_score=last.max_score if last else None,
                    last_session_date=last.date if last else None,
                )
            )
        return out

    async def _require_own_student(self, teacher_id: uuid.UUID, student_id: uuid.UUID) -> None:
        """Raise 404 unless this student is currently allocated to this teacher."""
        query = (
            select(Allocation)
            .where(Allocation.teacher_id == teacher_id)
            .where(Allocation.student_id == student_id)
        )
        result = await self.session.exec(query)
        if result.first() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This student is not allocated to you",
            )

    async def list_student_session_scores(
        self, teacher_id: uuid.UUID, student_id: uuid.UUID
    ) -> list[SessionScore]:
        await self._require_own_student(teacher_id, student_id)
        query = (
            select(SessionScore)
            .where(SessionScore.student_id == student_id)
            .where(SessionScore.teacher_id == teacher_id)
            .order_by(SessionScore.date.desc())
        )
        result = await self.session.exec(query)
        return result.all()



    async def get_certificate(self, user_id: uuid.UUID) -> tuple[Path, str]:
        """The teacher's uploaded certificate on disk, plus a download name."""
        profile = await self._get_profile_row(user_id)
        file_path = Path(settings.upload_dir) / profile.certificate_path if profile.certificate_path else None
        if file_path is None or not file_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This teacher has no certificate on file.",
            )
        return file_path, f"certificate{file_path.suffix.lower()}"


# How far back a student may still rate a lesson they joined.
LESSON_REVIEW_WINDOW_DAYS = 14


class ReviewService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_teacher(self, teacher_id: uuid.UUID) -> list[TeacherReviewResponse]:
        result = await self.session.exec(
            select(TeacherReview)
            .where(TeacherReview.teacher_id == teacher_id)
            .order_by(TeacherReview.created_at.desc())
        )
        reviews = result.all()
        student_names = await self._lesson_student_names(
            {r.allocation_id for r in reviews if r.allocation_id}
        )
        return [
            TeacherReviewResponse.model_validate(r).model_copy(
                update={"student_name": student_names.get(r.allocation_id)}
            )
            for r in reviews
        ]

    async def _lesson_student_names(self, allocation_ids: set[uuid.UUID]) -> dict[uuid.UUID, str]:
        if not allocation_ids:
            return {}
        result = await self.session.exec(
            select(Allocation.id, User)
            .join(User, Allocation.student_id == User.id)
            .where(Allocation.id.in_(allocation_ids))
        )
        return {alloc_id: _full_name(student) for alloc_id, student in result.all()}

    async def create_audit(
        self, teacher_id: uuid.UUID, admin: User, body: TeacherReviewCreate
    ) -> TeacherReviewResponse:
        """An admin's evaluation of a teacher. Every audit is its own row, so
        the history of evaluations over time is kept."""
        teacher = await self.session.get(User, teacher_id)
        if teacher is None or teacher.role != UserRole.TEACHER:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")

        lesson = (body.allocation_id, body.session_date, body.scheduled_time)
        if any(v is not None for v in lesson) and not all(v is not None for v in lesson):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A lesson needs allocation_id, session_date and scheduled_time together.",
            )
        if body.allocation_id is not None:
            allocation = await self.session.get(Allocation, body.allocation_id)
            if allocation is None or allocation.teacher_id != teacher_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="That lesson doesn't belong to this teacher.",
                )

        review = TeacherReview(
            teacher_id=teacher_id,
            reviewer_id=admin.id,
            reviewer_name=_full_name(admin),
            rating=body.rating,
            comment=body.comment,
            is_admin=True,
            kind=ReviewKind.ADMIN_AUDIT.value,
            allocation_id=body.allocation_id,
            session_date=body.session_date,
            scheduled_time=body.scheduled_time,
        )
        self.session.add(review)
        await self.session.commit()
        await self.session.refresh(review)
        names = await self._lesson_student_names({review.allocation_id} if review.allocation_id else set())
        return TeacherReviewResponse.model_validate(review).model_copy(
            update={"student_name": names.get(review.allocation_id)}
        )

    async def recent_lessons_for_student(self, student: User) -> list[ReviewableLesson]:
        """Lessons this student joined in the review window, newest first,
        with the rating they already gave (if any)."""
        since = datetime.now(CAIRO_TZ).date() - timedelta(days=LESSON_REVIEW_WINDOW_DAYS)
        result = await self.session.exec(
            select(SessionAttendance, User)
            .join(Allocation, SessionAttendance.allocation_id == Allocation.id)
            .join(User, Allocation.teacher_id == User.id)
            .where(SessionAttendance.user_id == student.id)
            .where(SessionAttendance.session_date >= since)
            .order_by(SessionAttendance.session_date.desc(), SessionAttendance.joined_at.desc())
        )
        rows = result.all()

        reviews_result = await self.session.exec(
            select(TeacherReview)
            .where(TeacherReview.reviewer_id == student.id)
            .where(TeacherReview.kind == ReviewKind.STUDENT_SESSION.value)
            .where(TeacherReview.session_date >= since)
        )
        mine = {
            (r.allocation_id, r.session_date, r.scheduled_time): r for r in reviews_result.all()
        }

        lessons = []
        for attendance, teacher in rows:
            review = mine.get((attendance.allocation_id, attendance.session_date, attendance.scheduled_time))
            lessons.append(ReviewableLesson(
                allocation_id=attendance.allocation_id,
                session_date=attendance.session_date,
                scheduled_day=attendance.scheduled_day,
                scheduled_time=attendance.scheduled_time,
                teacher_name=_full_name(teacher),
                rating=review.rating if review else None,
                comment=review.comment if review else None,
            ))
        return lessons

    async def submit_lesson_review(
        self, student: User, body: LessonReviewCreate
    ) -> TeacherReviewResponse:
        """Rate one lesson the student joined. Submitting again for the same
        lesson edits the earlier rating instead of adding a second one."""
        since = datetime.now(CAIRO_TZ).date() - timedelta(days=LESSON_REVIEW_WINDOW_DAYS)
        if body.session_date < since:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Lessons can be rated for {LESSON_REVIEW_WINDOW_DAYS} days after they happen.",
            )

        attended = await self.session.exec(
            select(SessionAttendance)
            .where(SessionAttendance.allocation_id == body.allocation_id)
            .where(SessionAttendance.user_id == student.id)
            .where(SessionAttendance.session_date == body.session_date)
            .where(SessionAttendance.scheduled_time == body.scheduled_time)
        )
        allocation = await self.session.get(Allocation, body.allocation_id)
        if attended.first() is None or allocation is None or allocation.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only rate lessons you joined.",
            )

        existing_result = await self.session.exec(
            select(TeacherReview)
            .where(TeacherReview.reviewer_id == student.id)
            .where(TeacherReview.kind == ReviewKind.STUDENT_SESSION.value)
            .where(TeacherReview.allocation_id == body.allocation_id)
            .where(TeacherReview.session_date == body.session_date)
            .where(TeacherReview.scheduled_time == body.scheduled_time)
        )
        review = existing_result.first()
        if review is None:
            review = TeacherReview(
                teacher_id=allocation.teacher_id,
                reviewer_id=student.id,
                reviewer_name=_full_name(student),
                rating=body.rating,
                comment=body.comment,
                kind=ReviewKind.STUDENT_SESSION.value,
                allocation_id=body.allocation_id,
                session_date=body.session_date,
                scheduled_time=body.scheduled_time,
            )
        else:
            review.rating = body.rating
            review.comment = body.comment
            review.updated_at = datetime.utcnow()
        self.session.add(review)
        await self.session.commit()
        await self.session.refresh(review)
        return TeacherReviewResponse.model_validate(review).model_copy(
            update={"student_name": review.reviewer_name}
        )


def _full_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email

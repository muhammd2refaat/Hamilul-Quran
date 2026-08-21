import uuid
from typing import Optional, Sequence

from fastapi import HTTPException, UploadFile, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.storage import save_certificate
from app.features.allocations.models import Allocation
from app.features.sessions.models import SessionScore
from app.features.sessions.service import SessionService
from app.features.teachers.models import Ijaza, IjazaType, TeacherProfile, TeacherReview
from app.features.teachers.schemas import (
    IjazaResponse,
    PaginatedTeachers,
    TeacherProfileResponse,
    TeacherProfileUpdate,
    TeacherPublicResponse,
    TeacherStatsResponse,
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

    async def get_my_stats(self, teacher_id: uuid.UUID) -> TeacherStatsResponse:
        """Backend-computed roster + score aggregates for the teacher's own
        Overview page — one query each, instead of the caller fetching the
        full student list and reducing it client-side."""
        roster_result = await self.session.exec(
            select(func.count(), func.coalesce(func.sum(Allocation.sessions_per_week), 0))
            .where(Allocation.teacher_id == teacher_id)
        )
        student_count, sessions_per_week_total = roster_result.one()

        avg_score_result = await self.session.exec(
            select(func.avg(SessionScore.score * 100.0 / SessionScore.max_score))
            .where(SessionScore.teacher_id == teacher_id)
        )
        avg_score = avg_score_result.one()
        avg_score_pct = round(avg_score, 1) if avg_score is not None else None

        attendance = await SessionService(self.session).get_attendance_summary(
            teacher_id, UserRole.TEACHER
        )

        return TeacherStatsResponse(
            student_count=student_count,
            sessions_per_week_total=sessions_per_week_total,
            avg_score_pct=avg_score_pct,
            sessions_attended_total=attendance.total_sessions,
        )

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


class ReviewService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_for_teacher(self, teacher_id: uuid.UUID) -> list[TeacherReview]:
        result = await self.session.exec(
            select(TeacherReview)
            .where(TeacherReview.teacher_id == teacher_id)
            .order_by(TeacherReview.created_at.desc())
        )
        return result.all()

    async def create(
        self,
        teacher_id: uuid.UUID,
        reviewer_id: Optional[uuid.UUID],
        reviewer_name: str,
        rating: int,
        comment: Optional[str],
        is_admin: bool,
    ) -> TeacherReview:
        """Create a review, or update the reviewer's existing review for this
        teacher if one already exists — one review per reviewer per teacher."""
        if reviewer_id is not None:
            existing_result = await self.session.exec(
                select(TeacherReview)
                .where(TeacherReview.teacher_id == teacher_id)
                .where(TeacherReview.reviewer_id == reviewer_id)
            )
            existing = existing_result.first()
            if existing is not None:
                existing.reviewer_name = reviewer_name
                existing.rating = rating
                existing.comment = comment
                existing.is_admin = is_admin
                self.session.add(existing)
                await self.session.commit()
                await self.session.refresh(existing)
                return existing

        review = TeacherReview(
            teacher_id=teacher_id,
            reviewer_id=reviewer_id,
            reviewer_name=reviewer_name,
            rating=rating,
            comment=comment,
            is_admin=is_admin,
        )
        self.session.add(review)
        await self.session.commit()
        await self.session.refresh(review)
        return review

    async def average_rating(self, teacher_id: uuid.UUID) -> Optional[float]:
        reviews = await self.list_for_teacher(teacher_id)
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 2)

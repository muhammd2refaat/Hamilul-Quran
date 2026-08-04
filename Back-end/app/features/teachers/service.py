import uuid
from typing import Optional, Sequence

from fastapi import HTTPException, UploadFile, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.storage import save_certificate
from app.features.allocations.models import Allocation
from app.features.sessions.models import SessionScore
from app.features.teachers.models import Ijaza, IjazaType, TeacherProfile, TeacherReview
from app.features.teachers.schemas import (
    IjazaResponse,
    TeacherProfileResponse,
    TeacherProfileUpdate,
    TeacherStudentResponse,
)
from app.features.users.models import User


class TeacherService:
    def __init__(self, session: AsyncSession):
        self.session = session

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

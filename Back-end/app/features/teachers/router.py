from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep, StudentDep
from app.features.sessions.schemas import SessionScoreResponse
from app.features.teachers.schemas import (
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
from app.features.teachers.service import ReviewService, TeacherService
from app.features.users.models import UserRole

router = APIRouter(prefix="/teachers")


def _get_teacher_svc(session=Depends(get_session)) -> TeacherService:
    return TeacherService(session=session)


def _get_review_svc(session=Depends(get_session)) -> ReviewService:
    return ReviewService(session=session)


TeacherSvcDep = Annotated[TeacherService, Depends(_get_teacher_svc)]
ReviewSvcDep = Annotated[ReviewService, Depends(_get_review_svc)]

# Certificates are magic-byte checked on upload (core/storage.py), so the
# saved extension is trustworthy.
_CERTIFICATE_MEDIA_TYPES = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


def _require_self_or_admin(current_user, teacher_id: uuid.UUID) -> None:
    if current_user.role != UserRole.ADMIN and current_user.id != teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only view or edit your own teacher profile",
        )


def _require_teacher(current_user) -> None:
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers may access their student roster",
        )


# ── Public browse ─────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=PaginatedTeachers,
    summary="Browse all teacher profiles (any authenticated user)",
)
async def list_teachers(
    _: CurrentUserDep,
    svc: TeacherSvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return await svc.list_all_teachers(limit=limit, offset=offset)


# NOTE: these /me/... routes must be registered before /{teacher_id} below,
# otherwise FastAPI will try to parse "me" as a teacher_id UUID and 422.
@router.get(
    "/me/students",
    response_model=list[TeacherStudentResponse],
    summary="List the current teacher's assigned students",
)
async def list_my_students(current_user: CurrentUserDep, svc: TeacherSvcDep):
    _require_teacher(current_user)
    return await svc.list_my_students(current_user.id)


@router.get(
    "/me/students/{student_id}/session-scores",
    response_model=list[SessionScoreResponse],
    summary="List session scores the current teacher recorded for one of their students",
)
async def list_my_student_session_scores(
    student_id: uuid.UUID, current_user: CurrentUserDep, svc: TeacherSvcDep
):
    _require_teacher(current_user)
    return await svc.list_student_session_scores(current_user.id, student_id)


@router.get(
    "/{teacher_id}",
    response_model=TeacherPublicResponse,
    summary="Get a teacher's public profile (any authenticated user)",
)
async def get_teacher_profile(
    teacher_id: uuid.UUID, current_user: CurrentUserDep, svc: TeacherSvcDep
):
    """Returns the public-safe profile. Admins and the teacher themselves can
    call GET /teachers/{teacher_id} — everyone else gets the same public view."""
    return await svc.get_public_profile(teacher_id)


@router.get(
    "/{teacher_id}/full",
    response_model=TeacherProfileResponse,
    summary="Get full teacher profile (self or ADMIN only)",
)
async def get_teacher_full_profile(
    teacher_id: uuid.UUID, current_user: CurrentUserDep, svc: TeacherSvcDep
):
    _require_self_or_admin(current_user, teacher_id)
    return await svc.get_profile(teacher_id)


@router.patch(
    "/{teacher_id}",
    response_model=TeacherProfileResponse,
    summary="Update a teacher's profile (self or ADMIN)",
)
async def update_teacher_profile(
    teacher_id: uuid.UUID,
    body: TeacherProfileUpdate,
    current_user: CurrentUserDep,
    svc: TeacherSvcDep,
):
    _require_self_or_admin(current_user, teacher_id)
    return await svc.update_profile(teacher_id, body)


@router.get(
    "/{teacher_id}/certificate",
    summary="Download a teacher's uploaded certificate (self or ADMIN)",
)
async def download_teacher_certificate(
    teacher_id: uuid.UUID, current_user: CurrentUserDep, svc: TeacherSvcDep
):
    _require_self_or_admin(current_user, teacher_id)
    file_path, filename = await svc.get_certificate(teacher_id)
    return FileResponse(
        path=file_path,
        media_type=_CERTIFICATE_MEDIA_TYPES.get(file_path.suffix.lower(), "application/octet-stream"),
        filename=filename,
    )


@router.get(
    "/{teacher_id}/reviews",
    response_model=list[TeacherReviewResponse],
    summary="All of a teacher's reviews — students' lesson ratings and admin audits (ADMIN)",
)
async def list_teacher_reviews(teacher_id: uuid.UUID, _: AdminDep, svc: ReviewSvcDep):
    return await svc.list_for_teacher(teacher_id)


@router.post(
    "/{teacher_id}/reviews",
    response_model=TeacherReviewResponse,
    status_code=201,
    summary="Record an admin audit of a teacher, optionally about one lesson (ADMIN)",
)
async def create_teacher_review(
    teacher_id: uuid.UUID,
    body: TeacherReviewCreate,
    current_user: AdminDep,
    svc: ReviewSvcDep,
):
    """Students rate teachers per lesson through /lesson-reviews instead."""
    return await svc.create_audit(teacher_id, current_user, body)


# ── Student lesson ratings ────────────────────────────────────────────────────
lesson_reviews_router = APIRouter(prefix="/lesson-reviews")


@lesson_reviews_router.get(
    "/me",
    response_model=list[ReviewableLesson],
    summary="Lessons I joined recently that I can rate, with my ratings (STUDENT)",
)
async def list_my_reviewable_lessons(current_user: StudentDep, svc: ReviewSvcDep):
    return await svc.recent_lessons_for_student(current_user)


@lesson_reviews_router.post(
    "",
    response_model=TeacherReviewResponse,
    summary="Rate a lesson I joined — submitting again edits my rating (STUDENT)",
)
async def submit_lesson_review(
    body: LessonReviewCreate, current_user: StudentDep, svc: ReviewSvcDep
):
    return await svc.submit_lesson_review(current_user, body)

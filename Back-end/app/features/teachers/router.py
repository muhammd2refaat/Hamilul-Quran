from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.sessions.schemas import SessionScoreResponse
from app.features.teachers.schemas import (
    PaginatedTeachers,
    TeacherProfileResponse,
    TeacherProfileUpdate,
    TeacherPublicResponse,
    TeacherReviewCreate,
    TeacherReviewResponse,
    TeacherStatsResponse,
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
    "/me/stats",
    response_model=TeacherStatsResponse,
    summary="Backend-computed stats for the current teacher's Overview page",
)
async def get_my_stats(current_user: CurrentUserDep, svc: TeacherSvcDep):
    _require_teacher(current_user)
    return await svc.get_my_stats(current_user.id)


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
    "/{teacher_id}/reviews",
    response_model=list[TeacherReviewResponse],
    summary="List a teacher's reviews",
)
async def list_teacher_reviews(teacher_id: uuid.UUID, _: CurrentUserDep, svc: ReviewSvcDep):
    return await svc.list_for_teacher(teacher_id)


@router.post(
    "/{teacher_id}/reviews",
    response_model=TeacherReviewResponse,
    status_code=201,
    summary="Leave a review for a teacher",
)
async def create_teacher_review(
    teacher_id: uuid.UUID,
    body: TeacherReviewCreate,
    current_user: CurrentUserDep,
    svc: ReviewSvcDep,
):
    if current_user.id == teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot review yourself",
        )

    reviewer_name = body.reviewer_name or f"{current_user.first_name} {current_user.last_name}".strip()
    return await svc.create(
        teacher_id=teacher_id,
        reviewer_id=current_user.id,
        reviewer_name=reviewer_name or current_user.email,
        rating=body.rating,
        comment=body.comment,
        is_admin=current_user.role == UserRole.ADMIN,
    )

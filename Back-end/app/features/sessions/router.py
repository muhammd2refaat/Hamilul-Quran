from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_session
from app.core.dependencies import CurrentUserDep
from app.features.sessions.schemas import SessionScoreCreate, SessionScoreResponse
from app.features.sessions.service import SessionService
from app.features.users.models import UserRole

router = APIRouter(prefix="/session-scores")


def _get_svc(session=Depends(get_session)) -> SessionService:
    return SessionService(session=session)


SvcDep = Annotated[SessionService, Depends(_get_svc)]


@router.post("", response_model=SessionScoreResponse, status_code=201, summary="Record a session score")
async def create_session_score(
    body: SessionScoreCreate,
    current_user: CurrentUserDep,
    svc: SvcDep,
):
    """Teachers record scores for their own sessions; admins may record a
    score on behalf of any teacher by supplying teacher_id explicitly."""
    if current_user.role == UserRole.TEACHER:
        teacher_id = current_user.id
    elif current_user.role == UserRole.ADMIN:
        if not body.teacher_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="teacher_id is required when recording a score as an admin",
            )
        teacher_id = body.teacher_id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or admins may record session scores",
        )

    return await svc.create_score(body, teacher_id=teacher_id)

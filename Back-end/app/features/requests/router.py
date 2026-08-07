from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, Request
from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.core.rate_limit import limiter
from app.features.requests.schemas import (
    PublicTrialRequestCreate,
    RequestCreate,
    RequestGlobalResponse,
    RequestResponse,
    RequestStatusUpdate,
)
from app.features.requests.service import RequestService

router = APIRouter(prefix="/requests", tags=["Requests"])


def _get_svc(session=Depends(get_session)) -> RequestService:
    return RequestService(session=session)


SvcDep = Annotated[RequestService, Depends(_get_svc)]


@router.get("", response_model=list[RequestGlobalResponse], summary="List all requests (ADMIN)")
async def list_requests(_: AdminDep, svc: SvcDep):
    return await svc.get_all_requests()


@router.get("/me", response_model=list[RequestResponse], summary="List my requests")
async def list_my_requests(current_user: CurrentUserDep, svc: SvcDep):
    return await svc.get_user_requests(current_user.id)


@router.post("", response_model=RequestResponse, status_code=201, summary="File a new request")
async def create_request(body: RequestCreate, current_user: CurrentUserDep, svc: SvcDep):
    return await svc.create(current_user.id, current_user.role, body)


@router.post(
    "/public/trial",
    response_model=RequestResponse,
    status_code=201,
    summary="Public free-trial request (no auth — landing page form)",
)
@limiter.limit("5/minute")
async def create_public_trial_request(
    request: Request, body: PublicTrialRequestCreate, svc: SvcDep
):
    """Unauthenticated: anyone can submit this from the marketing landing
    page. Rate-limited per IP to curb spam on an otherwise open endpoint."""
    return await svc.create_public_trial_request(body)


@router.patch(
    "/{request_id}/status",
    response_model=RequestGlobalResponse,
    summary="Update request status (ADMIN)",
)
async def update_request_status(
    request_id: uuid.UUID, body: RequestStatusUpdate, _: AdminDep, svc: SvcDep
):
    return await svc.update_status(request_id, body.status, body.admin_note)

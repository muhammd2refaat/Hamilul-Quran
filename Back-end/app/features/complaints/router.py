from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, status
from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.complaints.schemas import (
    ComplaintCreate,
    ComplaintGlobalResponse,
    ComplaintResponse,
    ComplaintStatusUpdate,
)
from app.features.complaints.service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def _get_svc(session=Depends(get_session)) -> ComplaintService:
    return ComplaintService(session=session)

SvcDep = Annotated[ComplaintService, Depends(_get_svc)]

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED, summary="File a complaint")
async def file_complaint(body: ComplaintCreate, current_user: CurrentUserDep, svc: SvcDep):
    """Any authenticated user (student or teacher) can file a complaint.
    `complaint_from` is inferred from the caller's role."""
    return await svc.create_complaint(current_user.id, current_user.role, body)

@router.get("", response_model=list[ComplaintGlobalResponse], summary="List all complaints (ADMIN)")
async def list_complaints(_: AdminDep, svc: SvcDep):
    return await svc.get_all_complaints()

@router.patch("/{complaint_id}/status", response_model=ComplaintGlobalResponse, summary="Update complaint status (ADMIN)")
async def update_complaint_status(complaint_id: uuid.UUID, body: ComplaintStatusUpdate, _: AdminDep, svc: SvcDep):
    return await svc.update_complaint_status(complaint_id, body.status, body.admin_note)

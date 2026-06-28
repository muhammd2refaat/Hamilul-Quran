from typing import Annotated
import uuid
from fastapi import APIRouter, Depends
from app.core.database import get_session
from app.core.dependencies import AdminDep
from app.features.complaints.schemas import ComplaintGlobalResponse, ComplaintStatusUpdate
from app.features.complaints.service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def _get_svc(session=Depends(get_session)) -> ComplaintService:
    return ComplaintService(session=session)

SvcDep = Annotated[ComplaintService, Depends(_get_svc)]

@router.get("", response_model=list[ComplaintGlobalResponse], summary="List all complaints (ADMIN)")
async def list_complaints(_: AdminDep, svc: SvcDep):
    return await svc.get_all_complaints()

@router.patch("/{complaint_id}/status", response_model=ComplaintGlobalResponse, summary="Update complaint status (ADMIN)")
async def update_complaint_status(complaint_id: uuid.UUID, body: ComplaintStatusUpdate, _: AdminDep, svc: SvcDep):
    return await svc.update_complaint_status(complaint_id, body.status, body.admin_note)

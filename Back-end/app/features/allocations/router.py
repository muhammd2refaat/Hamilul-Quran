from typing import Annotated
import uuid
from fastapi import APIRouter, Depends

from app.core.database import get_session
from app.core.dependencies import AdminDep
from app.features.allocations.schemas import (
    AllocationCreate,
    AllocationPreviewRequest,
    AllocationPreviewResponse,
    AllocationResponse,
    AllocationUpdate,
)
from app.features.allocations.service import AllocationService

router = APIRouter(prefix="/allocations")

def _get_svc(session=Depends(get_session)) -> AllocationService:
    return AllocationService(session=session)

from app.core.dependencies import AdminDep, CurrentUserDep

SvcDep = Annotated[AllocationService, Depends(_get_svc)]

@router.get("/me", response_model=list[AllocationResponse], summary="Get my allocations")
async def get_my_allocations(current_user: CurrentUserDep, svc: SvcDep):
    return await svc.get_user_allocations(current_user.id, current_user.role)

@router.get("", response_model=list[AllocationResponse], summary="List all allocations (ADMIN)")
async def list_allocations(_: AdminDep, svc: SvcDep):
    return await svc.get_all()

@router.post(
    "/preview",
    response_model=AllocationPreviewResponse,
    summary="Which lessons an allocation would schedule, given the student's sessions (ADMIN)",
)
async def preview_allocation(body: AllocationPreviewRequest, _: AdminDep, svc: SvcDep):
    from app.features.sessions.schedule import preview_allocation as _preview

    return await _preview(
        svc.session, body.student_id, [s.model_dump() for s in body.schedule], body.duration,
        exclude_allocation_id=body.allocation_id,
    )

@router.post("", response_model=AllocationResponse, status_code=201, summary="Create allocation (ADMIN)")
async def create_allocation(_: AdminDep, svc: SvcDep, body: AllocationCreate):
    return await svc.create(body)

@router.patch("/{allocation_id}", response_model=AllocationResponse, summary="Update allocation (ADMIN)")
async def update_allocation(
    allocation_id: uuid.UUID, body: AllocationUpdate, _: AdminDep, svc: SvcDep
):
    return await svc.update(allocation_id, body)

@router.delete("/{allocation_id}", status_code=204, summary="Delete allocation (ADMIN)")
async def delete_allocation(allocation_id: uuid.UUID, _: AdminDep, svc: SvcDep):
    await svc.delete(allocation_id)

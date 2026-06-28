from typing import Annotated
from fastapi import APIRouter, Depends

from app.core.database import get_session
from app.core.dependencies import AdminDep
from app.features.allocations.schemas import AllocationCreate, AllocationResponse
from app.features.allocations.service import AllocationService

router = APIRouter(prefix="/allocations")

def _get_svc(session=Depends(get_session)) -> AllocationService:
    return AllocationService(session=session)

SvcDep = Annotated[AllocationService, Depends(_get_svc)]

@router.get("", response_model=list[AllocationResponse], summary="List all allocations (ADMIN)")
async def list_allocations(_: AdminDep, svc: SvcDep):
    return await svc.get_all()

@router.post("", response_model=AllocationResponse, status_code=201, summary="Create allocation (ADMIN)")
async def create_allocation(_: AdminDep, svc: SvcDep, body: AllocationCreate):
    return await svc.create(body)

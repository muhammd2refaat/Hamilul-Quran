from typing import Annotated, Optional
import uuid

from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.dependencies import AdminDep, AdminOrProcurementDep, CurrentUserDep
from app.features.suppliers.schemas import (
    SupplierCreate, SupplierUpdate, SupplierResponse, PaginatedSuppliers
)
from app.features.suppliers.service import SupplierService

router = APIRouter(prefix="/suppliers")


def _get_svc(session=Depends(get_session)) -> SupplierService:
    return SupplierService(session=session)


SvcDep = Annotated[SupplierService, Depends(_get_svc)]


@router.get(
    "",
    response_model=PaginatedSuppliers,
    summary="List suppliers with search & pagination",
)
async def list_suppliers(
    _: CurrentUserDep,
    svc: SvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Search company name, contact, or email"),
):
    items, total = await svc.get_all(limit=limit, offset=offset, search=search)
    return PaginatedSuppliers(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=201,
    summary="Create supplier (ADMIN or PROCUREMENT)",
)
async def create_supplier(_: AdminOrProcurementDep, svc: SvcDep, body: SupplierCreate):
    return await svc.create(body)


@router.get("/{supplier_id}", response_model=SupplierResponse, summary="Get supplier by ID")
async def get_supplier(supplier_id: uuid.UUID, _: CurrentUserDep, svc: SvcDep):
    return await svc.get_by_id(supplier_id)


@router.patch(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Update supplier (ADMIN or PROCUREMENT)",
)
async def update_supplier(
    supplier_id: uuid.UUID, body: SupplierUpdate, _: AdminOrProcurementDep, svc: SvcDep
):
    return await svc.update(supplier_id, body)


@router.delete("/{supplier_id}", status_code=204, summary="Delete supplier (ADMIN)")
async def delete_supplier(supplier_id: uuid.UUID, _: AdminDep, svc: SvcDep):
    await svc.delete(supplier_id)

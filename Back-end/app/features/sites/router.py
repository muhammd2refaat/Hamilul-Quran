from typing import Annotated, Optional
import uuid

from fastapi import APIRouter, Depends, Query

from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep
from app.features.sites.schemas import SiteCreate, SiteUpdate, SiteResponse, PaginatedSites
from app.features.sites.service import SiteService
from app.features.users.models import UserRole

router = APIRouter(prefix="/sites")


def _get_svc(session=Depends(get_session)) -> SiteService:
    return SiteService(session=session)


SvcDep = Annotated[SiteService, Depends(_get_svc)]


@router.get("", response_model=PaginatedSites, summary="List sites")
async def list_sites(
    current_user: CurrentUserDep,
    svc: SvcDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
):
    # SITE_ACCOUNTABLE: filter to their own site automatically
    accountable_filter = None
    if current_user.role == UserRole.SITE_ACCOUNTABLE:
        accountable_filter = current_user.id

    items, total = await svc.get_all(
        limit=limit, offset=offset, search=search,
        accountable_user_id=accountable_filter,
    )
    return PaginatedSites(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=SiteResponse, status_code=201, summary="Create site (ADMIN)")
async def create_site(_: AdminDep, svc: SvcDep, body: SiteCreate):
    return await svc.create(body)


@router.get("/{site_id}", response_model=SiteResponse, summary="Get site by ID")
async def get_site(site_id: uuid.UUID, current_user: CurrentUserDep, svc: SvcDep):
    site = await svc.get_by_id(site_id)
    # SITE_ACCOUNTABLE can only view their own site
    if (
        current_user.role == UserRole.SITE_ACCOUNTABLE
        and site.accountable_user_id != current_user.id
    ):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this site",
        )
    return site


@router.patch("/{site_id}", response_model=SiteResponse, summary="Update site (ADMIN)")
async def update_site(site_id: uuid.UUID, body: SiteUpdate, _: AdminDep, svc: SvcDep):
    return await svc.update(site_id, body)


@router.delete("/{site_id}", status_code=204, summary="Delete site (ADMIN)")
async def delete_site(site_id: uuid.UUID, _: AdminDep, svc: SvcDep):
    await svc.delete(site_id)

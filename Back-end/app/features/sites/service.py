import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.features.sites.models import Site
from app.features.sites.schemas import SiteCreate, SiteUpdate


class SiteService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        accountable_user_id: Optional[uuid.UUID] = None,
    ) -> tuple[list[Site], int]:
        query = select(Site)
        count_query = select(func.count()).select_from(Site)

        if search:
            like = f"%{search}%"
            query = query.where(Site.name.ilike(like))
            count_query = count_query.where(Site.name.ilike(like))

        if accountable_user_id:
            query = query.where(Site.accountable_user_id == accountable_user_id)
            count_query = count_query.where(Site.accountable_user_id == accountable_user_id)

        total = (await self.session.exec(count_query)).one()
        result = await self.session.exec(
            query.order_by(Site.name).limit(limit).offset(offset)
        )
        return result.all(), total

    async def get_by_id(self, site_id: uuid.UUID) -> Site:
        result = await self.session.exec(select(Site).where(Site.id == site_id))
        site = result.first()
        if not site:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
        return site

    async def create(self, data: SiteCreate) -> Site:
        site = Site(**data.model_dump())
        self.session.add(site)
        await self.session.commit()
        await self.session.refresh(site)
        return site

    async def update(self, site_id: uuid.UUID, data: SiteUpdate) -> Site:
        site = await self.get_by_id(site_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(site, field, value)
        self.session.add(site)
        await self.session.commit()
        await self.session.refresh(site)
        return site

    async def delete(self, site_id: uuid.UUID) -> None:
        site = await self.get_by_id(site_id)
        await self.session.delete(site)
        await self.session.commit()

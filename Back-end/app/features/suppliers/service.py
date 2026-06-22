import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.features.suppliers.models import Supplier
from app.features.suppliers.schemas import SupplierCreate, SupplierUpdate


class SupplierService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
    ) -> tuple[list[Supplier], int]:
        query = select(Supplier)
        count_query = select(func.count()).select_from(Supplier)

        if search:
            like = f"%{search}%"
            # Search across company_name, contact_name, email
            condition = or_(
                Supplier.company_name.ilike(like),
                Supplier.contact_name.ilike(like),
                Supplier.email.ilike(like),
            )
            query = query.where(condition)
            count_query = count_query.where(condition)

        total = (await self.session.exec(count_query)).one()
        result = await self.session.exec(
            query.order_by(Supplier.company_name).limit(limit).offset(offset)
        )
        return result.all(), total

    async def get_by_id(self, supplier_id: uuid.UUID) -> Supplier:
        result = await self.session.exec(
            select(Supplier).where(Supplier.id == supplier_id)
        )
        supplier = result.first()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found"
            )
        return supplier

    async def create(self, data: SupplierCreate) -> Supplier:
        supplier = Supplier(**data.model_dump())
        self.session.add(supplier)
        await self.session.commit()
        await self.session.refresh(supplier)
        return supplier

    async def update(self, supplier_id: uuid.UUID, data: SupplierUpdate) -> Supplier:
        supplier = await self.get_by_id(supplier_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(supplier, field, value)
        self.session.add(supplier)
        await self.session.commit()
        await self.session.refresh(supplier)
        return supplier

    async def delete(self, supplier_id: uuid.UUID) -> None:
        supplier = await self.get_by_id(supplier_id)
        # Hard delete — will RESTRICT if items reference this supplier
        await self.session.delete(supplier)
        await self.session.commit()

import datetime
import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.features.requests.models import PlatformRequest, RequestStatus
from app.features.requests.schemas import RequestCreate
from app.features.users.models import User


class RequestService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_requests(self, user_id: uuid.UUID) -> list[PlatformRequest]:
        query = (
            select(PlatformRequest)
            .where(PlatformRequest.user_id == user_id)
            .order_by(PlatformRequest.created_at.desc())
        )
        result = await self.session.exec(query)
        return result.all()

    async def get_all_requests(self) -> list[dict]:
        query = (
            select(PlatformRequest, User)
            .join(User, PlatformRequest.user_id == User.id)
            .order_by(PlatformRequest.created_at.desc())
        )
        result = await self.session.exec(query)
        rows = result.all()

        out = []
        for req, filer in rows:
            r_dict = req.model_dump()
            r_dict["from_name"] = f"{filer.first_name} {filer.last_name}".strip() or filer.email
            out.append(r_dict)
        return out

    async def create(self, user_id: uuid.UUID, data: RequestCreate) -> PlatformRequest:
        req = PlatformRequest(user_id=user_id, **data.model_dump())
        self.session.add(req)
        await self.session.commit()
        await self.session.refresh(req)
        return req

    async def update_status(
        self, request_id: uuid.UUID, status: RequestStatus, admin_note: str | None
    ) -> dict:
        req = await self.session.get(PlatformRequest, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")

        req.status = status
        if admin_note is not None:
            req.admin_note = admin_note
        if status in (RequestStatus.APPROVED, RequestStatus.REJECTED):
            req.resolved_at = datetime.datetime.utcnow()

        self.session.add(req)
        await self.session.commit()
        await self.session.refresh(req)

        filer = await self.session.get(User, req.user_id)
        r_dict = req.model_dump()
        r_dict["from_name"] = (
            f"{filer.first_name} {filer.last_name}".strip() or filer.email
            if filer
            else "Unknown"
        )
        return r_dict

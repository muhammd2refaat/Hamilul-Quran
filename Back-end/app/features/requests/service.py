import datetime
import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.config.settings import settings
from app.core.email import send_email
from app.features.requests.models import PlatformRequest, RequestFromRole, RequestStatus
from app.features.requests.schemas import RequestCreate
from app.features.users.models import User, UserRole

_FROM_ROLE_BY_USER_ROLE = {
    UserRole.STUDENT: RequestFromRole.STUDENT,
    UserRole.TEACHER: RequestFromRole.TEACHER,
}


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

    async def create(
        self, user_id: uuid.UUID, user_role: UserRole, data: RequestCreate
    ) -> PlatformRequest:
        """from_role is derived from the authenticated user's actual role,
        never trusted from the client, so a caller can't misrepresent who
        they are filing a request as."""
        from_role = _FROM_ROLE_BY_USER_ROLE.get(user_role)
        if from_role is None:
            raise HTTPException(
                status_code=400,
                detail="Your account role cannot file this type of request",
            )
        req = PlatformRequest(user_id=user_id, from_role=from_role, **data.model_dump())
        self.session.add(req)
        await self.session.commit()
        await self.session.refresh(req)

        await self._notify_admin(req, user_id)
        return req

    async def _notify_admin(self, req: PlatformRequest, user_id: uuid.UUID) -> None:
        """Best-effort email to the admin inbox — never raises, so a mail
        outage can't fail the request submission itself."""
        filer = await self.session.get(User, user_id)
        filer_label = f"{filer.first_name} {filer.last_name}".strip() or filer.email if filer else str(user_id)
        subject = f"[Elhafazah] New {req.type.value.replace('_', ' ')} request from {filer_label}"
        body = (
            f"From: {filer_label} ({req.from_role.value})\n"
            f"Type: {req.type.value}\n"
            f"Submitted: {req.created_at}\n"
            f"\nDetails:\n{req.details}\n"
        )
        if req.requested_teacher:
            body += f"\nPreferred teacher: {req.requested_teacher}\n"
        if req.requested_plan:
            body += f"\nRequested plan: {req.requested_plan}\n"
        await send_email(settings.admin_email, subject, body)

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

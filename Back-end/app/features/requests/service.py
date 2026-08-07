import datetime
import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.config.settings import settings
from app.core.email import send_email
from app.core.email_templates import build_trial_confirmation_email
from app.features.requests.models import (
    PlatformRequest,
    RequestFromRole,
    RequestStatus,
    RequestType,
)
from app.features.requests.schemas import PublicTrialRequestCreate, RequestCreate
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
        # isouter=True: GUEST requests (public trial form) have no user_id,
        # so an inner join would silently drop them from the admin list.
        query = (
            select(PlatformRequest, User)
            .join(User, PlatformRequest.user_id == User.id, isouter=True)
            .order_by(PlatformRequest.created_at.desc())
        )
        result = await self.session.exec(query)
        rows = result.all()

        out = []
        for req, filer in rows:
            r_dict = req.model_dump()
            if filer:
                r_dict["from_name"] = f"{filer.first_name} {filer.last_name}".strip() or filer.email
            else:
                r_dict["from_name"] = req.guest_name or req.guest_email or "Guest"
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

        await self._notify_admin(req)
        if req.type == RequestType.NEW_ENROLLMENT:
            # In-dashboard "request a free trial" — no lang carried on
            # RequestCreate today, so this defaults to English. req.details
            # is whatever they typed in the comment field for this request.
            await self._send_trial_confirmation(req, lang="en", message=req.details)
        return req

    async def create_public_trial_request(self, data: PublicTrialRequestCreate) -> PlatformRequest:
        """Public, unauthenticated "Free trial" form on the landing page
        (components/landing/LandingPage.tsx). No account exists yet — contact
        details are stored directly on the request (guest_*) rather than
        resolved from a User row, and from_role is GUEST, not trusted input."""
        details = f"Program: {data.program}"
        if data.message:
            details += f"\nMessage: {data.message}"

        req = PlatformRequest(
            user_id=None,
            from_role=RequestFromRole.GUEST,
            type=RequestType.NEW_ENROLLMENT,
            details=details,
            requested_plan=data.program,
            guest_name=data.full_name,
            guest_email=data.email,
            guest_phone=data.phone,
        )
        self.session.add(req)
        await self.session.commit()
        await self.session.refresh(req)

        await self._notify_admin(req)
        await self._send_trial_confirmation(req, lang=data.lang, message=data.message)
        return req

    async def _notify_admin(self, req: PlatformRequest) -> None:
        """Best-effort email to the admin inbox — never raises, so a mail
        outage can't fail the request submission itself."""
        if req.user_id:
            filer = await self.session.get(User, req.user_id)
            filer_label = (
                f"{filer.first_name} {filer.last_name}".strip() or filer.email
                if filer
                else str(req.user_id)
            )
        else:
            filer_label = f"{req.guest_name} (guest, not yet registered)"

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
        if req.guest_email:
            body += f"\nGuest email: {req.guest_email}\n"
        if req.guest_phone:
            body += f"\nGuest phone: {req.guest_phone}\n"
        notify_email = settings.contact_notification_email or settings.admin_email
        await send_email(notify_email, subject, body)

    async def _send_trial_confirmation(
        self, req: PlatformRequest, *, lang: str = "en", message: str | None = None
    ) -> None:
        """Best-effort welcome/confirmation email to whoever filed a
        free-trial request — guest or an already-registered student —
        with what they submitted and a reassurance we'll be in touch.
        Never raises (send_email itself never raises)."""
        if req.user_id:
            filer = await self.session.get(User, req.user_id)
            if not filer or not filer.email:
                return
            to_email = filer.email
            name = f"{filer.first_name} {filer.last_name}".strip() or filer.email
            phone = filer.phone_number
        else:
            if not req.guest_email:
                return
            to_email = req.guest_email
            name = req.guest_name or "there"
            phone = req.guest_phone

        subject, text_body, html_body = build_trial_confirmation_email(
            name=name,
            program=req.requested_plan,
            phone=phone,
            message=message,
            lang=lang if lang in ("en", "ar") else "en",  # type: ignore[arg-type]
        )
        await send_email(to_email, subject, text_body, html_body=html_body)

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

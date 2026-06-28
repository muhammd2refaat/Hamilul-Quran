import uuid
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException
from app.features.complaints.models import Complaint, ComplaintStatus
from app.features.users.models import User

class ComplaintService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_complaints(self, user_id: uuid.UUID) -> list[Complaint]:
        query = select(Complaint).where(Complaint.user_id == user_id).order_by(Complaint.created_at.desc())
        result = await self.session.exec(query)
        return result.all()

    async def get_all_complaints(self) -> list[dict]:
        # Perform joins to get user and about names
        query = select(Complaint, User).join(User, Complaint.user_id == User.id).order_by(Complaint.created_at.desc())
        result = await self.session.exec(query)
        rows = result.all()
        
        # We also need about_name. Since about_id can be None, we handle it.
        # It's easier to fetch all users locally since the number of users is small, or do an outer join.
        # Let's just fetch all users first for a simple map.
        users_query = select(User)
        users_result = await self.session.exec(users_query)
        user_map = {u.id: f"{u.first_name} {u.last_name}" for u in users_result.all()}
        
        out = []
        for complaint, filer in rows:
            c_dict = complaint.model_dump()
            c_dict["filed_by_name"] = f"{filer.first_name} {filer.last_name}"
            c_dict["about_name"] = user_map.get(complaint.about_id, "System") if complaint.about_id else "System"
            out.append(c_dict)
            
        return out

    async def update_complaint_status(self, complaint_id: uuid.UUID, status: ComplaintStatus, admin_note: str | None) -> dict:
        complaint = await self.session.get(Complaint, complaint_id)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
            
        complaint.status = status
        if admin_note is not None:
            complaint.admin_note = admin_note
            
        import datetime
        if status in (ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED):
            complaint.resolved_at = datetime.datetime.utcnow()
            
        self.session.add(complaint)
        await self.session.commit()
        await self.session.refresh(complaint)
        
        # return global response shape
        users_query = select(User).where(User.id.in_([complaint.user_id, complaint.about_id]))
        users_result = await self.session.exec(users_query)
        user_map = {u.id: f"{u.first_name} {u.last_name}" for u in users_result.all()}
        
        c_dict = complaint.model_dump()
        c_dict["filed_by_name"] = user_map.get(complaint.user_id, "Unknown")
        c_dict["about_name"] = user_map.get(complaint.about_id, "System") if complaint.about_id else "System"
        
        return c_dict

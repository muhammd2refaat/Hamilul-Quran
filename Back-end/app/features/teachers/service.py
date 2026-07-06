import uuid
from typing import Optional, Sequence

from fastapi import UploadFile
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.storage import save_certificate
from app.features.teachers.models import TeacherProfile, Ijaza, IjazaType


class TeacherService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_profile(
        self,
        user_id: uuid.UUID,
        worked_online_before: bool,
        juz_memorized: Optional[int],
        ijazas: Sequence[IjazaType],
        certificate: Optional[UploadFile] = None,
    ) -> TeacherProfile:
        """
        Create a teacher's profile plus one Ijaza row per held ijaza, saving an
        optional certificate file to local storage.

        Adds rows to the session but does NOT commit — the caller owns the
        transaction (so user + profile + credentials commit atomically).
        """
        certificate_path = None
        if certificate is not None and certificate.filename:
            certificate_path = await save_certificate(certificate)

        profile = TeacherProfile(
            user_id=user_id,
            worked_online_before=worked_online_before,
            juz_memorized=juz_memorized,
            certificate_path=certificate_path,
        )
        self.session.add(profile)
        await self.session.flush()  # populate profile.id for the FK below

        for ijaza_type in ijazas:
            self.session.add(
                Ijaza(teacher_profile_id=profile.id, ijaza_type=ijaza_type)
            )

        return profile

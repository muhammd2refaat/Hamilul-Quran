import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete as sql_delete
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config.settings import settings
from app.core.storage import save_receipt
from app.features.receipts.models import Receipt
from app.features.users.models import User

logger = logging.getLogger(__name__)


class ReceiptService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self, student_id: uuid.UUID, file: UploadFile, amount: Optional[str], note: Optional[str]
    ) -> Receipt:
        saved = await save_receipt(file)
        receipt = Receipt(
            student_id=student_id,
            file_path=saved.path,
            original_filename=file.filename or "receipt",
            # The verified (magic-byte-sniffed) type, not the client's
            # Content-Type header — this value is later served back verbatim
            # as the response media_type, so it must not be attacker-controlled.
            content_type=saved.content_type,
            amount=amount,
            note=note,
        )
        self.session.add(receipt)
        await self.session.commit()
        await self.session.refresh(receipt)
        return receipt

    async def list_all(self) -> list[dict]:
        await self._purge_expired()
        query = (
            select(Receipt, User)
            .join(User, Receipt.student_id == User.id)
            .order_by(Receipt.created_at.desc())
        )
        result = await self.session.exec(query)
        rows = result.all()

        out = []
        for receipt, student in rows:
            r_dict = receipt.model_dump()
            r_dict["student_name"] = f"{student.first_name} {student.last_name}".strip() or student.email
            out.append(r_dict)
        return out

    async def list_for_student(self, student_id: uuid.UUID) -> list[Receipt]:
        await self._purge_expired()
        query = (
            select(Receipt)
            .where(Receipt.student_id == student_id)
            .order_by(Receipt.created_at.desc())
        )
        result = await self.session.exec(query)
        return result.all()

    async def get_for_download(
        self, receipt_id: uuid.UUID, current_user: User
    ) -> Receipt:
        """Return the Receipt row if the current user may download it
        (admin, or the student who owns it) and it hasn't expired."""
        from app.features.users.models import UserRole

        receipt = await self.session.get(Receipt, receipt_id)
        if not receipt or receipt.expires_at <= datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        if current_user.role != UserRole.ADMIN and current_user.id != receipt.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You may only view your own receipts",
            )
        return receipt

    async def _purge_expired(self) -> None:
        """Lazy sweep: delete expired receipt rows and their files on disk.
        Runs opportunistically on every list call — no scheduler needed."""
        now = datetime.utcnow()
        result = await self.session.exec(select(Receipt).where(Receipt.expires_at <= now))
        expired = result.all()
        if not expired:
            return

        for receipt in expired:
            self._delete_file_best_effort(receipt.file_path)

        await self.session.exec(sql_delete(Receipt).where(Receipt.expires_at <= now))
        await self.session.commit()

    @staticmethod
    def _delete_file_best_effort(relative_path: Optional[str]) -> None:
        if not relative_path:
            return
        try:
            path = Path(settings.upload_dir) / relative_path
            if path.is_file():
                path.unlink()
        except Exception:
            logger.warning("Failed to delete receipt file %s", relative_path, exc_info=True)

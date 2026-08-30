from pathlib import Path
from typing import Annotated, Optional
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.config.settings import settings
from app.core.database import get_session
from app.core.dependencies import AdminDep, CurrentUserDep, StudentDep
from app.features.receipts.schemas import ReceiptGlobalResponse, ReceiptResponse
from app.features.receipts.service import ReceiptService

router = APIRouter(prefix="/receipts", tags=["Receipts"])


def _get_svc(session=Depends(get_session)) -> ReceiptService:
    return ReceiptService(session=session)


SvcDep = Annotated[ReceiptService, Depends(_get_svc)]


@router.post("", response_model=ReceiptResponse, status_code=201, summary="Upload a payment receipt (STUDENT)")
async def upload_receipt(
    current_user: StudentDep,
    svc: SvcDep,
    file: UploadFile,
    amount: Optional[str] = Form(None),
    note: Optional[str] = Form(None),
):
    return await svc.create(current_user.id, file, amount, note)


@router.get("", response_model=list[ReceiptGlobalResponse], summary="List all receipts (ADMIN)")
async def list_receipts(_: AdminDep, svc: SvcDep):
    return await svc.list_all()


@router.get("/me", response_model=list[ReceiptResponse], summary="List my receipts")
async def list_my_receipts(current_user: CurrentUserDep, svc: SvcDep):
    return await svc.list_for_student(current_user.id)


@router.get("/{receipt_id}/file", summary="Download a receipt file (ADMIN or owner)")
async def download_receipt_file(receipt_id: uuid.UUID, current_user: CurrentUserDep, svc: SvcDep):
    receipt = await svc.get_for_download(receipt_id, current_user)
    file_path = Path(settings.upload_dir) / receipt.file_path
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This receipt's file is no longer available on the server.",
        )
    return FileResponse(
        path=file_path,
        media_type=receipt.content_type,
        filename=receipt.original_filename,
    )

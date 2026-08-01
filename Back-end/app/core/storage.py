"""
core/storage.py
===============
Minimal local-filesystem storage for uploaded files (teacher certificates,
payment receipts). Saves under settings.upload_dir and returns a relative
path stored in the DB.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config.settings import settings

_CERTIFICATE_SUBDIR = "certificates"
_CERTIFICATE_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}
_CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024  # 10 MB

_RECEIPT_SUBDIR = "receipts"
_RECEIPT_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg"}
_RECEIPT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


async def save_upload(
    file: UploadFile,
    *,
    subdir: str,
    allowed_content_types: set[str],
    max_bytes: int,
    invalid_type_detail: str,
    too_large_detail: str,
) -> str:
    """
    Persist an uploaded file to the local filesystem under
    `settings.upload_dir / subdir`. Returns the path relative to
    `settings.upload_dir` (stored in the DB). Raises 400 on unsupported
    type or oversize file.
    """
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=invalid_type_detail)

    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=too_large_detail)

    suffix = Path(file.filename or "").suffix.lower()
    filename = f"{uuid.uuid4().hex}{suffix}"

    dest_dir = Path(settings.upload_dir) / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(contents)

    return str(Path(subdir) / filename)


async def save_certificate(file: UploadFile) -> str:
    """Persist an uploaded teacher certificate (PDF or image)."""
    return await save_upload(
        file,
        subdir=_CERTIFICATE_SUBDIR,
        allowed_content_types=_CERTIFICATE_CONTENT_TYPES,
        max_bytes=_CERTIFICATE_MAX_BYTES,
        invalid_type_detail="Certificate must be a PDF or an image (PNG/JPEG).",
        too_large_detail="Certificate exceeds the 10 MB size limit.",
    )


async def save_receipt(file: UploadFile) -> str:
    """Persist an uploaded payment-receipt screenshot (image only)."""
    return await save_upload(
        file,
        subdir=_RECEIPT_SUBDIR,
        allowed_content_types=_RECEIPT_CONTENT_TYPES,
        max_bytes=_RECEIPT_MAX_BYTES,
        invalid_type_detail="Receipt must be an image (PNG/JPEG).",
        too_large_detail="Receipt exceeds the 10 MB size limit.",
    )

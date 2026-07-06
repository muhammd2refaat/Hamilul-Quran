"""
core/storage.py
===============
Minimal local-filesystem storage for uploaded files (teacher certificates).
Saves under settings.upload_dir and returns a relative path stored in the DB.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config.settings import settings

_CERTIFICATE_SUBDIR = "certificates"
_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


async def save_certificate(file: UploadFile) -> str:
    """
    Persist an uploaded certificate to the local filesystem.

    Returns the path relative to settings.upload_dir (stored in the DB).
    Raises 400 on unsupported type or oversize file.
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate must be a PDF or an image (PNG/JPEG).",
        )

    contents = await file.read()
    if len(contents) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate exceeds the 10 MB size limit.",
        )

    suffix = Path(file.filename or "").suffix.lower()
    filename = f"{uuid.uuid4().hex}{suffix}"

    dest_dir = Path(settings.upload_dir) / _CERTIFICATE_SUBDIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(contents)

    # Path relative to upload_dir, e.g. "certificates/<uuid>.pdf".
    return str(Path(_CERTIFICATE_SUBDIR) / filename)

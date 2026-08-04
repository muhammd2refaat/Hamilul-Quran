"""
core/storage.py
===============
Minimal local-filesystem storage for uploaded files (teacher certificates,
payment receipts). Saves under settings.upload_dir and returns a relative
path stored in the DB.
"""
import uuid
from pathlib import Path
from typing import NamedTuple, Optional

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

# Read in bounded chunks so an oversize upload never gets fully buffered into
# memory before the size check runs — worst case is ~max_bytes + one chunk,
# not the whole (attacker-controlled) request body.
_CHUNK_SIZE = 1024 * 1024  # 1 MB

# The client-supplied Content-Type header is just a string the client typed —
# trivially spoofed. These are the real file-signature (magic-byte) checks
# for the types we accept, verified against the actual bytes instead.
_MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/jpg": (b"\xff\xd8\xff",),
}
_MAX_SIGNATURE_LEN = 8


def _sniff_content_type(header: bytes) -> Optional[str]:
    for content_type, signatures in _MAGIC_SIGNATURES.items():
        if any(header.startswith(sig) for sig in signatures):
            return content_type
    return None


class SavedUpload(NamedTuple):
    path: str
    content_type: str  # the verified (sniffed) type, not the client's header


async def save_upload(
    file: UploadFile,
    *,
    subdir: str,
    allowed_content_types: set[str],
    max_bytes: int,
    invalid_type_detail: str,
    too_large_detail: str,
) -> SavedUpload:
    """
    Persist an uploaded file to the local filesystem under
    `settings.upload_dir / subdir`. Returns the path relative to
    `settings.upload_dir` (stored in the DB) plus the file's verified
    content type. Raises 400 on unsupported type — checked against the
    file's actual magic bytes, not the client-supplied Content-Type header
    — or oversize file, read in bounded chunks so the check runs well
    before the whole body would ever be buffered.
    """
    if file.content_type not in allowed_content_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=invalid_type_detail)

    chunks = bytearray()
    detected_type: Optional[str] = None
    while True:
        chunk = await file.read(_CHUNK_SIZE)
        if not chunk:
            break
        chunks.extend(chunk)

        if detected_type is None and len(chunks) >= _MAX_SIGNATURE_LEN:
            detected_type = _sniff_content_type(bytes(chunks[:_MAX_SIGNATURE_LEN]))
            if detected_type is None or detected_type not in allowed_content_types:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=invalid_type_detail)

        if len(chunks) > max_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=too_large_detail)

    if detected_type is None:
        # Fewer bytes than any known signature — too small to be a real file
        # of any allowed type.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=invalid_type_detail)

    suffix = Path(file.filename or "").suffix.lower()
    filename = f"{uuid.uuid4().hex}{suffix}"

    dest_dir = Path(settings.upload_dir) / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / filename
    dest_path.write_bytes(bytes(chunks))

    return SavedUpload(path=str(Path(subdir) / filename), content_type=detected_type)


async def save_certificate(file: UploadFile) -> str:
    """Persist an uploaded teacher certificate (PDF or image)."""
    saved = await save_upload(
        file,
        subdir=_CERTIFICATE_SUBDIR,
        allowed_content_types=_CERTIFICATE_CONTENT_TYPES,
        max_bytes=_CERTIFICATE_MAX_BYTES,
        invalid_type_detail="Certificate must be a PDF or an image (PNG/JPEG).",
        too_large_detail="Certificate exceeds the 10 MB size limit.",
    )
    return saved.path


async def save_receipt(file: UploadFile) -> SavedUpload:
    """Persist an uploaded payment-receipt screenshot (image only)."""
    return await save_upload(
        file,
        subdir=_RECEIPT_SUBDIR,
        allowed_content_types=_RECEIPT_CONTENT_TYPES,
        max_bytes=_RECEIPT_MAX_BYTES,
        invalid_type_detail="Receipt must be an image (PNG/JPEG).",
        too_large_detail="Receipt exceeds the 10 MB size limit.",
    )

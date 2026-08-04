"""Tests for /receipts/* — student upload, admin/student list, authenticated
file download, and the 30-day lazy-purge behavior."""
from datetime import datetime, timedelta

import pytest


def _png_file(name="receipt.png"):
    return {"file": (name, b"\x89PNG\r\n\x1a\n" + b"0" * 64, "image/png")}


@pytest.mark.asyncio
async def test_upload_receipt_as_student(client, student_headers):
    r = await client.post("/receipts", headers=student_headers, files=_png_file(), data={"amount": "50"})
    assert r.status_code == 201
    body = r.json()
    assert body["amount"] == "50"
    assert body["content_type"] == "image/png"


@pytest.mark.asyncio
async def test_upload_receipt_requires_student_role(client, admin_headers):
    r = await client.post("/receipts", headers=admin_headers, files=_png_file())
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_my_receipts(client, student_headers):
    await client.post("/receipts", headers=student_headers, files=_png_file(), data={"amount": "10"})
    r = await client.get("/receipts/me", headers=student_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_list_all_receipts_as_admin(client, admin_headers, student_headers, student_user):
    await client.post("/receipts", headers=student_headers, files=_png_file(), data={"amount": "20"})
    r = await client.get("/receipts", headers=admin_headers)
    assert r.status_code == 200
    match = next((rec for rec in r.json() if rec["student_id"] == str(student_user.id)), None)
    assert match is not None
    assert match["student_name"] == f"{student_user.first_name} {student_user.last_name}"


@pytest.mark.asyncio
async def test_list_all_receipts_requires_admin(client, student_headers):
    r = await client.get("/receipts", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_owner_can_download_receipt_file(client, student_headers):
    r = await client.post("/receipts", headers=student_headers, files=_png_file(), data={})
    receipt_id = r.json()["id"]

    r = await client.get(f"/receipts/{receipt_id}/file", headers=student_headers)
    assert r.status_code == 200
    assert r.content.startswith(b"\x89PNG\r\n\x1a\n")


@pytest.mark.asyncio
async def test_admin_can_download_any_receipt_file(client, admin_headers, student_headers):
    r = await client.post("/receipts", headers=student_headers, files=_png_file(), data={})
    receipt_id = r.json()["id"]

    r = await client.get(f"/receipts/{receipt_id}/file", headers=admin_headers)
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_other_student_cannot_download_receipt_file(client, student_headers, make_user):
    from app.core.security import create_access_token

    r = await client.post("/receipts", headers=student_headers, files=_png_file(), data={})
    receipt_id = r.json()["id"]

    other = await make_user(email="other-receipt-viewer@apitest.dev", username="other_receipt_viewer")
    other_headers = {"Authorization": f"Bearer {create_access_token(other.id, extra_claims={'role': 'STUDENT'})}"}

    r = await client.get(f"/receipts/{receipt_id}/file", headers=other_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_expired_receipt_is_filtered_and_purged(client, student_headers, db_session):
    from pathlib import Path

    from app.config.settings import settings
    from app.features.receipts.models import Receipt

    r = await client.post("/receipts", headers=student_headers, files=_png_file(), data={})
    receipt_id = r.json()["id"]

    receipt_row = await db_session.get(Receipt, receipt_id)
    file_path = Path(settings.upload_dir) / receipt_row.file_path
    assert file_path.is_file()

    receipt_row.expires_at = datetime.utcnow() - timedelta(days=1)
    db_session.add(receipt_row)
    await db_session.commit()

    r = await client.get("/receipts/me", headers=student_headers)
    assert r.status_code == 200
    assert not any(rec["id"] == receipt_id for rec in r.json())

    assert await db_session.get(Receipt, receipt_id) is None
    assert not file_path.is_file()


@pytest.mark.asyncio
async def test_upload_rejects_spoofed_content_type(client, student_headers):
    """Claims image/png in the multipart Content-Type field but the bytes
    are plain text — must be rejected by magic-byte sniffing, not trusted
    from the client-supplied header."""
    files = {"file": ("receipt.png", b"not actually a png, just text", "image/png")}
    r = await client.post("/receipts", headers=student_headers, files=files, data={})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_oversize_file(client, student_headers, monkeypatch):
    """Exercises the chunked read-and-abort path: the size check must fire
    without ever needing to buffer the whole (oversize) body."""
    from app.core import storage

    monkeypatch.setattr(storage, "_RECEIPT_MAX_BYTES", 1024)
    body = b"\x89PNG\r\n\x1a\n" + b"0" * 2048
    files = {"file": ("receipt.png", body, "image/png")}
    r = await client.post("/receipts", headers=student_headers, files=files, data={})
    assert r.status_code == 400

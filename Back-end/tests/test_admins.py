"""Admin accounts: the Super Admin manages the other admins (temporary
passwords by email, resets, deletes) and can't itself be deleted or
demoted; admins on a temporary password must change it first; forgotten
passwords are reset with an emailed 6-digit code."""
import re
from datetime import datetime, timedelta

import pytest
from sqlmodel import select

from app.config.settings import settings
from app.features.admins import service as admin_service
from app.features.admins.models import AdminAuditLog
from app.features.users.models import User, UserRole, UserStatus

NEW_PASSWORD = "BetterPass2026"


@pytest.fixture
def mails(monkeypatch):
    sent = []

    async def fake_send(to_email, subject, body, html_body=None, priority="normal"):
        sent.append({"to": to_email, "subject": subject, "body": body, "priority": priority})
        return True

    monkeypatch.setattr(admin_service, "send_email", fake_send)
    return sent


def _temp_password(mail) -> str:
    return re.search(r"Temporary password: (\S+)", mail["body"]).group(1)


def _code(mail) -> str:
    return re.search(r"\b(\d{6})\b", mail["body"]).group(1)


async def _login(client, email, password):
    return await client.post("/auth/login", json={"email": email, "password": password})


async def _audit(db_session, action):
    return (await db_session.exec(select(AdminAuditLog).where(AdminAuditLog.action == action))).all()


# ─── Listing ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_admins_requires_admin(client, student_headers):
    r = await client.get("/admins", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_any_admin_can_list_admins(client, admin_headers, admin_user, super_admin_user, student_user):
    r = await client.get("/admins", headers=admin_headers)
    assert r.status_code == 200
    items = {u["id"]: u for u in r.json()["items"]}
    assert str(admin_user.id) in items and str(student_user.id) not in items
    assert items[str(super_admin_user.id)]["is_super_admin"] is True


# ─── Super Admin only ────────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", [
    ("post", "/admins"),
    ("patch", "/admins/{id}"),
    ("delete", "/admins/{id}"),
    ("post", "/admins/{id}/reset-password"),
    ("get", "/admins/audit-log"),
    ("get", "/admins/email-usage"),
])
async def test_normal_admins_cannot_manage_admins(client, admin_headers, make_user, method, path):
    other = await make_user(role=UserRole.ADMIN)
    kwargs = {"json": {"email": "x@apitest.dev", "first_name": "X"}} if method in ("post", "patch") else {}
    r = await getattr(client, method)(path.format(id=other.id), headers=admin_headers, **kwargs)
    assert r.status_code == 403
    assert r.json()["message"] == "Only the Super Admin can do this"


@pytest.mark.asyncio
async def test_super_admin_adds_an_admin_with_an_emailed_temp_password(client, db_session, super_admin_headers, mails):
    r = await client.post("/admins", headers=super_admin_headers,
                          json={"email": "New-Admin@apitest.dev", "first_name": "New", "last_name": "Admin",
                                "password": "ignored-by-server", "role": "STUDENT"})
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "new-admin@apitest.dev"
    assert body["email_sent"] is True and body["must_change_password"] is True
    assert "password" not in body

    [mail] = mails
    assert mail["to"] == "new-admin@apitest.dev" and mail["priority"] == "high"
    user = (await db_session.exec(select(User).where(User.email == "new-admin@apitest.dev"))).one()
    assert user.role == UserRole.ADMIN and not user.is_super_admin
    assert timedelta(hours=23) < user.temp_password_expires_at - datetime.utcnow() <= timedelta(hours=24)
    assert len(await _audit(db_session, "created")) == 1


@pytest.mark.asyncio
async def test_duplicate_admin_email_is_rejected(client, super_admin_headers, student_user, mails):
    r = await client.post("/admins", headers=super_admin_headers,
                          json={"email": student_user.email, "first_name": "Dup"})
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_new_admin_must_change_the_temp_password_first(client, super_admin_headers, mails):
    await client.post("/admins", headers=super_admin_headers, json={"email": "first@apitest.dev", "first_name": "F"})
    temp = _temp_password(mails[0])

    r = await _login(client, "first@apitest.dev", temp)
    assert r.status_code == 200
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = (await client.get("/auth/me", headers=headers)).json()
    assert me["must_change_password"] is True and me["is_super_admin"] is False

    blocked = await client.get("/admins", headers=headers)
    assert blocked.status_code == 403 and blocked.json()["message"] == "Password change required"

    r = await client.post("/auth/change-password", headers=headers,
                          json={"current_password": temp, "new_password": NEW_PASSWORD})
    assert r.status_code == 204
    assert "access_token" in r.cookies  # this device stays signed in

    r = await _login(client, "first@apitest.dev", NEW_PASSWORD)
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert (await client.get("/admins", headers=headers)).status_code == 200


@pytest.mark.asyncio
async def test_expired_temp_password_cannot_sign_in(client, db_session, super_admin_headers, mails):
    await client.post("/admins", headers=super_admin_headers, json={"email": "late@apitest.dev", "first_name": "L"})
    user = (await db_session.exec(select(User).where(User.email == "late@apitest.dev"))).one()
    user.temp_password_expires_at = datetime.utcnow() - timedelta(minutes=1)
    db_session.add(user)
    await db_session.commit()

    r = await _login(client, "late@apitest.dev", _temp_password(mails[0]))
    assert r.status_code == 401
    assert "expired" in r.json()["message"]


@pytest.mark.asyncio
async def test_admin_passwords_need_letters_numbers_and_ten_characters(client, admin_user, admin_headers):
    r = await client.post("/auth/change-password", headers=admin_headers,
                          json={"current_password": "TestPass123!", "new_password": "onlyletters"})
    assert r.status_code == 422
    r = await client.post("/auth/change-password", headers=admin_headers,
                          json={"current_password": "TestPass123!", "new_password": "TestPass123!"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_changing_password_signs_out_other_devices(client, db_session, admin_user, admin_headers):
    # A token minted a moment before the change.
    admin_user.sessions_valid_after = None
    r = await client.post("/auth/change-password", headers=admin_headers,
                          json={"current_password": "TestPass123!", "new_password": NEW_PASSWORD})
    assert r.status_code == 204
    await db_session.refresh(admin_user)
    admin_user.sessions_valid_after += timedelta(seconds=2)  # make "earlier" unambiguous
    db_session.add(admin_user)
    await db_session.commit()
    assert (await client.get("/auth/me", headers=admin_headers)).status_code == 401


@pytest.mark.asyncio
async def test_super_admin_resets_another_admins_password(client, db_session, super_admin_headers, make_user,
                                                         auth_headers_for, mails):
    other = await make_user(role=UserRole.ADMIN, email="forgetful@apitest.dev")
    old_headers = auth_headers_for(other)
    r = await client.post(f"/admins/{other.id}/reset-password", headers=super_admin_headers)
    assert r.status_code == 200 and r.json()["email_sent"] is True

    assert (await _login(client, "forgetful@apitest.dev", "TestPass123!")).status_code == 401
    assert (await _login(client, "forgetful@apitest.dev", _temp_password(mails[0]))).status_code == 200
    await db_session.refresh(other)
    other.sessions_valid_after += timedelta(seconds=2)
    db_session.add(other)
    await db_session.commit()
    assert (await client.get("/auth/me", headers=old_headers)).status_code == 401
    assert len(await _audit(db_session, "password_reset")) == 1


@pytest.mark.asyncio
async def test_super_admin_cannot_reset_own_password_from_the_list(client, super_admin_user, super_admin_headers, mails):
    r = await client.post(f"/admins/{super_admin_user.id}/reset-password", headers=super_admin_headers)
    assert r.status_code == 400
    assert mails == []


@pytest.mark.asyncio
async def test_super_admin_edits_and_deletes_an_admin(client, db_session, super_admin_headers, make_user):
    other = await make_user(role=UserRole.ADMIN)
    r = await client.patch(f"/admins/{other.id}", headers=super_admin_headers,
                           json={"first_name": "Renamed", "status": "INACTIVE"})
    assert r.status_code == 200 and r.json()["first_name"] == "Renamed" and r.json()["status"] == "INACTIVE"
    [entry] = await _audit(db_session, "updated")
    assert "Renamed" in entry.details and "INACTIVE" in entry.details

    assert (await client.delete(f"/admins/{other.id}", headers=super_admin_headers)).status_code == 204
    assert (await db_session.get(User, other.id)) is None
    [deleted] = await _audit(db_session, "deleted")
    assert deleted.target_email == other.email  # the log outlives the account


@pytest.mark.asyncio
async def test_admin_routes_404_for_non_admin_users(client, super_admin_headers, student_user):
    assert (await client.patch(f"/admins/{student_user.id}", headers=super_admin_headers,
                               json={"first_name": "x"})).status_code == 404
    assert (await client.delete(f"/admins/{student_user.id}", headers=super_admin_headers)).status_code == 404


# ─── The Super Admin account is protected ────────────────────────────────────

@pytest.mark.asyncio
async def test_super_admin_cannot_be_deleted_or_deactivated(client, db_session, super_admin_user, super_admin_headers):
    sid = super_admin_user.id
    assert (await client.delete(f"/admins/{sid}", headers=super_admin_headers)).status_code == 403
    assert (await client.delete(f"/users/{sid}", headers=super_admin_headers)).status_code == 403
    assert (await client.patch(f"/admins/{sid}", headers=super_admin_headers,
                               json={"status": "INACTIVE"})).status_code == 403
    assert (await client.patch(f"/users/{sid}", headers=super_admin_headers,
                               json={"role": "STUDENT"})).status_code == 403
    assert (await client.patch(f"/users/{sid}", headers=super_admin_headers,
                               json={"status": "INACTIVE"})).status_code == 403
    await db_session.refresh(super_admin_user)
    assert super_admin_user.role == UserRole.ADMIN and super_admin_user.status == UserStatus.ACTIVE


@pytest.mark.asyncio
async def test_super_admin_can_rename_itself(client, super_admin_user, super_admin_headers):
    r = await client.patch(f"/admins/{super_admin_user.id}", headers=super_admin_headers, json={"first_name": "Owner"})
    assert r.status_code == 200 and r.json()["first_name"] == "Owner"


# ─── /users can't be used to get around the Admins page ─────────────────────

@pytest.mark.asyncio
async def test_users_endpoints_cannot_create_or_promote_admins(client, admin_headers, super_admin_headers, student_user):
    for headers in (admin_headers, super_admin_headers):
        r = await client.post("/users", headers=headers, json={
            "email": "sneaky@apitest.dev", "username": "sneaky", "first_name": "S", "last_name": "S", "role": "ADMIN",
        })
        assert r.status_code == 400
        r = await client.patch(f"/users/{student_user.id}", headers=headers, json={"role": "ADMIN"})
        assert r.status_code == 400


@pytest.mark.asyncio
async def test_normal_admin_cannot_delete_or_edit_admins_through_users(client, admin_headers, make_user):
    other = await make_user(role=UserRole.ADMIN)
    assert (await client.delete(f"/users/{other.id}", headers=admin_headers)).status_code == 403
    assert (await client.patch(f"/users/{other.id}", headers=admin_headers,
                               json={"first_name": "x"})).status_code == 403


@pytest.mark.asyncio
async def test_admins_still_manage_students(client, admin_headers, student_user):
    r = await client.patch(f"/users/{student_user.id}", headers=admin_headers, json={"first_name": "Edited"})
    assert r.status_code == 200
    assert (await client.delete(f"/users/{student_user.id}", headers=admin_headers)).status_code == 204


# ─── Forgot password: emailed code ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_reset_code_flow(client, db_session, admin_user, auth_headers_for, mails):
    old_headers = auth_headers_for(admin_user)
    r = await client.post("/admins/password-code/request", json={"email": admin_user.email})
    assert r.status_code == 204
    [mail] = mails
    assert mail["to"] == admin_user.email and mail["priority"] == "high"

    r = await client.post("/admins/password-code/confirm",
                          json={"email": admin_user.email, "code": _code(mail), "new_password": NEW_PASSWORD})
    assert r.status_code == 204
    assert (await _login(client, admin_user.email, NEW_PASSWORD)).status_code == 200
    assert (await _login(client, admin_user.email, "TestPass123!")).status_code == 401

    # The code is single-use.
    r = await client.post("/admins/password-code/confirm",
                          json={"email": admin_user.email, "code": _code(mail), "new_password": "Another2026x"})
    assert r.status_code == 400

    await db_session.refresh(admin_user)
    admin_user.sessions_valid_after += timedelta(seconds=2)
    db_session.add(admin_user)
    await db_session.commit()
    assert (await client.get("/auth/me", headers=old_headers)).status_code == 401
    assert len(await _audit(db_session, "password_reset_by_code")) == 1


@pytest.mark.asyncio
async def test_super_admin_code_goes_to_the_recovery_inbox(client, super_admin_user, mails):
    await client.post("/admins/password-code/request", json={"email": super_admin_user.email})
    assert mails[0]["to"] == "recovery@apitest.dev"


@pytest.mark.asyncio
async def test_reset_code_clears_a_temp_password(client, db_session, super_admin_headers, mails):
    await client.post("/admins", headers=super_admin_headers, json={"email": "lost@apitest.dev", "first_name": "L"})
    await client.post("/admins/password-code/request", json={"email": "lost@apitest.dev"})
    r = await client.post("/admins/password-code/confirm",
                          json={"email": "lost@apitest.dev", "code": _code(mails[1]), "new_password": NEW_PASSWORD})
    assert r.status_code == 204
    user = (await db_session.exec(select(User).where(User.email == "lost@apitest.dev"))).one()
    assert not user.must_change_password and user.temp_password_expires_at is None


@pytest.mark.asyncio
async def test_unknown_or_non_admin_emails_get_no_code(client, student_user, mails):
    for email in ("nobody@apitest.dev", student_user.email):
        r = await client.post("/admins/password-code/request", json={"email": email})
        assert r.status_code == 204
    assert mails == []


@pytest.mark.asyncio
async def test_too_many_wrong_codes_burn_the_code(client, admin_user, mails):
    await client.post("/admins/password-code/request", json={"email": admin_user.email})
    real = _code(mails[0])
    wrong = "000000" if real != "000000" else "111111"
    for _ in range(settings.admin_otp_max_attempts):
        r = await client.post("/admins/password-code/confirm",
                              json={"email": admin_user.email, "code": wrong, "new_password": NEW_PASSWORD})
        assert r.status_code == 400
    r = await client.post("/admins/password-code/confirm",
                          json={"email": admin_user.email, "code": real, "new_password": NEW_PASSWORD})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_codes_have_a_resend_wait_and_a_daily_limit(client, fake_redis, admin_user, mails, monkeypatch):
    await client.post("/admins/password-code/request", json={"email": admin_user.email})
    await client.post("/admins/password-code/request", json={"email": admin_user.email})
    assert len(mails) == 1  # second ask within the wait is ignored

    monkeypatch.setattr(settings, "admin_otp_daily_limit", 2)
    for _ in range(3):
        await fake_redis.delete(f"elhafazah:admin-otp:cooldown:{admin_user.id}")
        await client.post("/admins/password-code/request", json={"email": admin_user.email})
    assert len(mails) == 2


@pytest.mark.asyncio
async def test_reset_code_needs_a_strong_password(client, admin_user, mails):
    await client.post("/admins/password-code/request", json={"email": admin_user.email})
    r = await client.post("/admins/password-code/confirm",
                          json={"email": admin_user.email, "code": _code(mails[0]), "new_password": "short1"})
    assert r.status_code == 422

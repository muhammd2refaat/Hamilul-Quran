"""Tests for /admins/* — admin-only CRUD over ADMIN-role users."""
import uuid

import pytest


@pytest.mark.asyncio
async def test_list_admins_requires_admin(client, student_headers):
    r = await client.get("/admins", headers=student_headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_admins_only_shows_admin_role(client, admin_headers, admin_user, student_user):
    r = await client.get("/admins", headers=admin_headers)
    assert r.status_code == 200
    ids = {u["id"] for u in r.json()["items"]}
    assert str(admin_user.id) in ids
    assert str(student_user.id) not in ids


@pytest.mark.asyncio
async def test_create_admin_forces_admin_role(client, admin_headers):
    r = await client.post(
        "/admins", headers=admin_headers,
        json={
            "email": "new-admin@apitest.dev", "username": "new_admin",
            "first_name": "New", "last_name": "Admin", "role": "STUDENT",
        },
    )
    assert r.status_code == 201
    assert r.json()["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_update_admin_cannot_demote_role(client, admin_headers, make_user):
    from app.features.users.models import UserRole

    other_admin = await make_user(role=UserRole.ADMIN, email="demote-me@apitest.dev", username="demote_me")
    r = await client.patch(
        f"/admins/{other_admin.id}", headers=admin_headers,
        json={"role": "STUDENT", "first_name": "Renamed"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "ADMIN"  # role change silently ignored
    assert body["first_name"] == "Renamed"


@pytest.mark.asyncio
async def test_update_admin_404_for_non_admin_user(client, admin_headers, student_user):
    """PATCH /admins/{id} on a non-admin user id should 404, not silently
    edit a student through the admin endpoint."""
    r = await client.patch(f"/admins/{student_user.id}", headers=admin_headers, json={"first_name": "x"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_admin(client, admin_headers, make_user):
    from app.features.users.models import UserRole, User

    victim = await make_user(role=UserRole.ADMIN, email="delete-admin@apitest.dev", username="delete_admin")
    r = await client.delete(f"/admins/{victim.id}", headers=admin_headers)
    assert r.status_code == 204

    r = await client.get(f"/users/{victim.id}", headers=admin_headers)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_admin_404_for_non_admin_user(client, admin_headers, student_user):
    r = await client.delete(f"/admins/{student_user.id}", headers=admin_headers)
    assert r.status_code == 404

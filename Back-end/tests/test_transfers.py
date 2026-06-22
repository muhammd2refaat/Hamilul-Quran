"""
Tests for the Transfer State Machine — ACID Logic.

Covers:
- Full happy path: CREATE → APPROVE → IN_TRANSIT → RECEIVE
- Stock decremented on APPROVE, incremented on RECEIVE
- InsufficientStock: cannot approve when qty < requested
- Invalid state transitions are rejected
- CANCEL from REQUESTED: no stock movement
- CANCEL from APPROVED/IN_TRANSIT: stock is rolled back
- RBAC: only ADMIN can approve/transit; only ADMIN or target SA can receive
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.features.inventory.models import InventoryStock
from app.features.transfers.models import TransferRequest, TransferStatus
from app.features.transfers.service import TransferService
from app.features.users.models import User, UserRole
from tests.conftest import get_auth_headers


# ─── Unit tests (service-layer, no HTTP) ──────────────────────────────────────

class TestTransferServiceUnit:
    @pytest.fixture
    def svc(self, session, mock_redis):
        return TransferService(session=session, redis=mock_redis)

    async def test_create_transfer(
        self, svc, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        transfer = await svc.create(
            data_dict := __import__('app.features.transfers.schemas', fromlist=['TransferCreate']).TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=3,
            ),
            created_by=admin_user.id,
        )
        assert transfer.status == TransferStatus.REQUESTED
        assert transfer.quantity == 3

    async def test_full_transfer_lifecycle(
        self, svc, session, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        from app.features.transfers.schemas import TransferCreate

        # Initial: site_a has 10 units, site_b has 0
        assert stock_a.quantity_available == 10
        assert stock_b.quantity_available == 0

        transfer = await svc.create(
            TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=4,
            ),
            created_by=admin_user.id,
        )

        # APPROVE: source stock should drop to 6
        transfer = await svc.approve(transfer.id)
        assert transfer.status == TransferStatus.APPROVED

        await session.refresh(stock_a)
        assert stock_a.quantity_available == 6  # 10 - 4

        # IN_TRANSIT
        transfer = await svc.mark_in_transit(transfer.id)
        assert transfer.status == TransferStatus.IN_TRANSIT

        # RECEIVE: target stock should gain 4
        transfer = await svc.receive(transfer.id, admin_user)
        assert transfer.status == TransferStatus.RECEIVED

        await session.refresh(stock_b)
        assert stock_b.quantity_available == 4  # 0 + 4

    async def test_approve_insufficient_stock_raises(
        self, svc, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        from app.features.transfers.schemas import TransferCreate
        from fastapi import HTTPException

        # Try to transfer more than available (10)
        transfer = await svc.create(
            TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=99,  # Way more than 10 available
            ),
            created_by=admin_user.id,
        )
        with pytest.raises(HTTPException) as exc_info:
            await svc.approve(transfer.id)

        assert exc_info.value.status_code == 422
        assert "Insufficient stock" in exc_info.value.detail

    async def test_invalid_transition_raises(
        self, svc, session, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        from app.features.transfers.schemas import TransferCreate
        from fastapi import HTTPException

        transfer = await svc.create(
            TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=2,
            ),
            created_by=admin_user.id,
        )

        # Cannot go REQUESTED → RECEIVED directly
        with pytest.raises(HTTPException) as exc_info:
            await svc.receive(transfer.id, admin_user)

        assert exc_info.value.status_code == 422
        assert "Cannot transition" in exc_info.value.detail

    async def test_cancel_from_requested_no_stock_change(
        self, svc, session, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        from app.features.transfers.schemas import TransferCreate

        original_qty = stock_a.quantity_available  # 10

        transfer = await svc.create(
            TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=3,
            ),
            created_by=admin_user.id,
        )
        await svc.cancel(transfer.id, admin_user)

        await session.refresh(stock_a)
        # No stock should have been touched
        assert stock_a.quantity_available == original_qty

    async def test_cancel_approved_rolls_back_stock(
        self, svc, session, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        from app.features.transfers.schemas import TransferCreate

        initial_qty = stock_a.quantity_available  # 10

        transfer = await svc.create(
            TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=5,
            ),
            created_by=admin_user.id,
        )

        await svc.approve(transfer.id)
        await session.refresh(stock_a)
        assert stock_a.quantity_available == 5  # 10 - 5

        # Now cancel — should restore source stock to 10
        await svc.cancel(transfer.id, admin_user)
        await session.refresh(stock_a)
        assert stock_a.quantity_available == initial_qty  # rolled back to 10

    async def test_terminal_state_cannot_be_changed(
        self, svc, session, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        from app.features.transfers.schemas import TransferCreate
        from fastapi import HTTPException

        transfer = await svc.create(
            TransferCreate(
                source_site_id=test_site_a.id,
                target_site_id=test_site_b.id,
                item_id=test_item.id,
                quantity=1,
            ),
            created_by=admin_user.id,
        )
        await svc.cancel(transfer.id, admin_user)

        # Cannot cancel again
        with pytest.raises(HTTPException) as exc_info:
            await svc.cancel(transfer.id, admin_user)
        assert exc_info.value.status_code == 422


# ─── Integration tests (HTTP endpoints) ───────────────────────────────────────

class TestTransferEndpoints:
    async def test_create_transfer_endpoint(
        self, client, admin_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        headers = await get_auth_headers(client, "admin@test.io", "Admin@1234!")
        resp = await client.post(
            f"{settings.api_prefix}/transfers",
            headers=headers,
            json={
                "source_site_id": str(test_site_a.id),
                "target_site_id": str(test_site_b.id),
                "item_id": str(test_item.id),
                "quantity": 2,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "REQUESTED"
        assert data["quantity"] == 2

    async def test_non_admin_cannot_approve(
        self, client, admin_user, site_user, test_site_a, test_site_b, test_item, stock_a, stock_b
    ):
        # Create as admin
        admin_headers = await get_auth_headers(client, "admin@test.io", "Admin@1234!")
        site_headers = await get_auth_headers(client, "site@test.io", "Site@1234!")

        resp = await client.post(
            f"{settings.api_prefix}/transfers",
            headers=admin_headers,
            json={
                "source_site_id": str(test_site_a.id),
                "target_site_id": str(test_site_b.id),
                "item_id": str(test_item.id),
                "quantity": 1,
            },
        )
        transfer_id = resp.json()["id"]

        # Site accountable tries to approve — should fail
        resp = await client.patch(
            f"{settings.api_prefix}/transfers/{transfer_id}/approve",
            headers=site_headers,
        )
        assert resp.status_code == 403

"""
Transfer State Machine — ACID-Safe Service
==========================================

State transitions:

    REQUESTED ──────────────── CANCELLED (creator or ADMIN)
        │
      APPROVE (ADMIN or SOURCE site's SITE_ACCOUNTABLE)
        │
        ▼
    APPROVED ──────────────── CANCELLED (ADMIN, stock rolled back)
        │
      TRANSIT (ADMIN or SOURCE site's SITE_ACCOUNTABLE)
        │
        ▼
    IN_TRANSIT ─────────────── CANCELLED (ADMIN, stock rolled back)
        │
      RECEIVE (ADMIN, TARGET SITE_ACCOUNTABLE, or TECHNICIAN at target site)
        │
        ▼
    RECEIVED (terminal)

Business Rules:
- Requester (TECHNICIAN/SITE_ACCOUNTABLE/PROCUREMENT) can only request transfers
  TO their own site (target_site_id must equal user.site_id).
- APPROVE & TRANSIT: only ADMIN or the SOURCE site's SITE_ACCOUNTABLE can act
  (they are giving the items away, so they must authorise the release).
- RECEIVE: only ADMIN, the TARGET site's SITE_ACCOUNTABLE, or a TECHNICIAN
  assigned to the target site can confirm receipt.
- Every state transition is recorded in TransferHistory.

ACID Guarantee:
- All stock mutations use `SELECT FOR UPDATE` (row-level locking).
- Stock decrements/increments happen inside the same DB transaction as the status update.
"""

import json
import uuid
from typing import Optional

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy import func, select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.redis_client import RedisChannels
from app.features.inventory.models import InventoryStock
from app.features.transfers.models import TransferRequest, TransferStatus, TransferHistory
from app.features.transfers.schemas import TransferCreate
from app.features.users.models import User, UserRole

# Valid state transitions map: {from_status: [allowed_to_statuses]}
VALID_TRANSITIONS: dict[TransferStatus, list[TransferStatus]] = {
    TransferStatus.REQUESTED: [TransferStatus.APPROVED, TransferStatus.CANCELLED],
    TransferStatus.APPROVED: [TransferStatus.IN_TRANSIT, TransferStatus.CANCELLED],
    TransferStatus.IN_TRANSIT: [TransferStatus.RECEIVED, TransferStatus.CANCELLED],
    TransferStatus.RECEIVED: [],   # Terminal state
    TransferStatus.CANCELLED: [],  # Terminal state
}


class InsufficientStockError(HTTPException):
    def __init__(self, available: int, requested: int):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Insufficient stock: {available} units available, "
                f"{requested} units requested"
            ),
        )


class TransferService:
    def __init__(self, session: AsyncSession, redis: aioredis.Redis):
        self.session = session
        self.redis = redis

    # ─── Helpers ──────────────────────────────────────────────────────────

    async def _get_transfer(self, transfer_id: uuid.UUID) -> TransferRequest:
        result = await self.session.exec(
            select(TransferRequest).where(TransferRequest.id == transfer_id)
        )
        transfer = result.first()
        if not transfer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transfer request not found",
            )
        return transfer

    async def _get_transfer_enriched(self, transfer_id: uuid.UUID) -> TransferRequest:
        """Fetch transfer with all related data eagerly loaded."""
        from app.features.sites.models import Site
        from app.features.inventory.models import InventoryItem
        result = await self.session.exec(
            select(TransferRequest)
            .options(
                selectinload(TransferRequest.history),
            )
            .where(TransferRequest.id == transfer_id)
        )
        transfer = result.first()
        if not transfer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transfer request not found",
            )

        # Manually attach nested objects so they are available for the schema
        from app.features.sites.models import Site
        from app.features.inventory.models import InventoryItem

        src = (await self.session.exec(select(Site).where(Site.id == transfer.source_site_id))).first()
        tgt = (await self.session.exec(select(Site).where(Site.id == transfer.target_site_id))).first()
        itm = (await self.session.exec(select(InventoryItem).where(InventoryItem.id == transfer.item_id))).first()
        usr = (await self.session.exec(select(User).where(User.id == transfer.created_by))).first()

        transfer.__dict__["source_site"] = src
        transfer.__dict__["target_site"] = tgt
        transfer.__dict__["item"] = itm
        transfer.__dict__["requester"] = usr
        return transfer

    def _assert_transition(
        self, transfer: TransferRequest, target_status: TransferStatus
    ) -> None:
        allowed = VALID_TRANSITIONS.get(transfer.status, [])
        if target_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Cannot transition from {transfer.status.value} "
                    f"to {target_status.value}. "
                    f"Allowed: {[s.value for s in allowed] or 'none (terminal state)'}"
                ),
            )

    async def _get_stock_for_update(
        self, site_id: uuid.UUID, item_id: uuid.UUID, label: str = "site"
    ) -> InventoryStock:
        """Fetch stock row with SELECT FOR UPDATE — row-level lock."""
        result = await self.session.exec(
            select(InventoryStock)
            .where(
                InventoryStock.site_id == site_id,
                InventoryStock.item_id == item_id,
            )
            .with_for_update()
        )
        stock = result.first()
        if not stock:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"No stock record exists for this item at the {label}.",
            )
        return stock

    async def _get_site_accountable_id(self, site_id: uuid.UUID) -> Optional[uuid.UUID]:
        """Return the accountable user ID of a site, or None if unset."""
        from app.features.sites.models import Site
        result = await self.session.exec(select(Site).where(Site.id == site_id))
        site = result.first()
        return site.accountable_user_id if site else None

    def _user_is_accountable_of(self, user: User, accountable_id: Optional[uuid.UUID]) -> bool:
        """True when the user is the designated SITE_ACCOUNTABLE for a site."""
        return accountable_id is not None and user.id == accountable_id

    async def _assert_is_source_site_actor(self, transfer: "TransferRequest", user: User) -> None:
        """
        Raise 403 unless the user is ADMIN or the SITE_ACCOUNTABLE of the SOURCE site.
        Used for approve and transit — the source site releases the goods.
        """
        if user.role == UserRole.ADMIN:
            return
        if user.role != UserRole.SITE_ACCOUNTABLE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only ADMIN or the source site's accountable manager can perform this action.",
            )
        accountable_id = await self._get_site_accountable_id(transfer.source_site_id)
        if not self._user_is_accountable_of(user, accountable_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only ADMIN or the source site's accountable manager can perform this action.",
            )

    async def _assert_is_target_site_actor(self, transfer: "TransferRequest", user: User) -> None:
        """
        Raise 403 unless the user is ADMIN, the SITE_ACCOUNTABLE of the TARGET site,
        or a TECHNICIAN assigned to the target site.
        Used for receive — the target site confirms arrival of the goods.
        """
        if user.role == UserRole.ADMIN:
            return
        if user.role == UserRole.SITE_ACCOUNTABLE:
            accountable_id = await self._get_site_accountable_id(transfer.target_site_id)
            if not self._user_is_accountable_of(user, accountable_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only confirm receipt for your own site.",
                )
            return
        if user.role == UserRole.TECHNICIAN:
            if user.site_id != transfer.target_site_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only confirm receipt for your own site.",
                )
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to confirm receipt of this transfer.",
        )

    async def _log_history(
        self,
        transfer: TransferRequest,
        to_status: TransferStatus,
        changed_by: uuid.UUID,
        from_status: Optional[TransferStatus] = None,
        note: Optional[str] = None,
    ) -> None:
        """Record a history entry — called inside an open transaction."""
        entry = TransferHistory(
            transfer_id=transfer.id,
            from_status=from_status,
            to_status=to_status,
            changed_by_id=changed_by,
            note=note,
        )
        self.session.add(entry)

    async def _publish_transfer_event(
        self, transfer: TransferRequest, old_status: TransferStatus
    ) -> None:
        """Publish a transfer status change event to Redis pub/sub."""
        await self.redis.publish(
            RedisChannels.TRANSFER_STATUS_CHANGED,
            json.dumps({
                "transfer_id": str(transfer.id),
                "source_site_id": str(transfer.source_site_id),
                "target_site_id": str(transfer.target_site_id),
                "item_id": str(transfer.item_id),
                "quantity": transfer.quantity,
                "from_status": old_status.value,
                "to_status": transfer.status.value,
            }),
        )

    # ─── CRUD ─────────────────────────────────────────────────────────────

    async def create(self, data: TransferCreate, created_by: uuid.UUID, current_user: User) -> TransferRequest:
        """
        Create a transfer request.
        - TECHNICIAN / SITE_ACCOUNTABLE: target_site_id MUST be their own site_id.
        - ADMIN: can request any transfer freely.
        """
        if current_user.role in (UserRole.TECHNICIAN, UserRole.SITE_ACCOUNTABLE):
            if current_user.site_id is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to any site. Contact your administrator.",
                )
            if data.target_site_id != current_user.site_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only request transfers to your own site.",
                )

        transfer = TransferRequest(
            source_site_id=data.source_site_id,
            target_site_id=data.target_site_id,
            item_id=data.item_id,
            quantity=data.quantity,
            notes=data.notes,
            created_by=created_by,
        )
        self.session.add(transfer)
        await self.session.flush()  # get transfer.id before history

        await self._log_history(
            transfer=transfer,
            to_status=TransferStatus.REQUESTED,
            changed_by=created_by,
            note="Transfer request created",
        )

        await self.session.commit()
        return await self._get_transfer_enriched(transfer.id)

    async def get_all(
        self,
        limit: int = 20,
        offset: int = 0,
        site_id: Optional[uuid.UUID] = None,
        status_filter: Optional[TransferStatus] = None,
        current_user: Optional[User] = None,
    ) -> tuple[list[TransferRequest], int]:
        query = select(TransferRequest)
        count_query = select(func.count()).select_from(TransferRequest)

        # TECHNICIAN: see only transfers for their site
        if current_user and current_user.role == UserRole.TECHNICIAN:
            if current_user.site_id:
                site_cond = (TransferRequest.target_site_id == current_user.site_id)
                query = query.where(site_cond)
                count_query = count_query.where(site_cond)

        # SITE_ACCOUNTABLE: see transfers involving their accountable site
        elif current_user and current_user.role == UserRole.SITE_ACCOUNTABLE:
            from app.features.sites.models import Site
            result = await self.session.exec(
                select(Site).where(Site.accountable_user_id == current_user.id)
            )
            own_site = result.first()
            if own_site:
                site_cond = (
                    (TransferRequest.source_site_id == own_site.id)
                    | (TransferRequest.target_site_id == own_site.id)
                )
                query = query.where(site_cond)
                count_query = count_query.where(site_cond)

        if site_id:
            site_cond = (
                (TransferRequest.source_site_id == site_id)
                | (TransferRequest.target_site_id == site_id)
            )
            query = query.where(site_cond)
            count_query = count_query.where(site_cond)

        if status_filter:
            query = query.where(TransferRequest.status == status_filter)
            count_query = count_query.where(TransferRequest.status == status_filter)

        total = (await self.session.exec(count_query)).one()
        result = await self.session.exec(
            query.order_by(TransferRequest.created_at.desc()).limit(limit).offset(offset)
        )
        transfers = result.all()

        # Enrich each transfer
        enriched = []
        for t in transfers:
            enriched.append(await self._get_transfer_enriched(t.id))
        return enriched, total

    async def get_by_id(self, transfer_id: uuid.UUID) -> TransferRequest:
        return await self._get_transfer_enriched(transfer_id)

    async def get_history(self, transfer_id: uuid.UUID) -> list[TransferHistory]:
        result = await self.session.exec(
            select(TransferHistory)
            .where(TransferHistory.transfer_id == transfer_id)
            .order_by(TransferHistory.changed_at.asc())
        )
        return list(result.all())

    # ─── State Machine Transitions ────────────────────────────────────────

    async def approve(self, transfer_id: uuid.UUID, current_user: User) -> TransferRequest:
        """
        APPROVE: REQUESTED → APPROVED
        Allowed: ADMIN or the SOURCE site's SITE_ACCOUNTABLE.
        The source site manager confirms they can release the goods.
        Atomically decrements source site stock.
        """
        transfer = await self._get_transfer(transfer_id)
        self._assert_transition(transfer, TransferStatus.APPROVED)

        # Authorization: ADMIN or SOURCE site's SITE_ACCOUNTABLE
        await self._assert_is_source_site_actor(transfer, current_user)

        # 🔒 Lock and check source stock
        source_stock = await self._get_stock_for_update(
            transfer.source_site_id, transfer.item_id, label="source site"
        )
        if source_stock.quantity_available < transfer.quantity:
            raise InsufficientStockError(
                available=source_stock.quantity_available,
                requested=transfer.quantity,
            )

        old_status = transfer.status
        source_stock.quantity_available -= transfer.quantity
        transfer.status = TransferStatus.APPROVED

        self.session.add(source_stock)
        self.session.add(transfer)

        await self._log_history(
            transfer=transfer,
            to_status=TransferStatus.APPROVED,
            changed_by=current_user.id,
            from_status=old_status,
            note=f"Approved by {current_user.email}. {transfer.quantity} units reserved from source site stock.",
        )
        await self.session.commit()

        await self._publish_transfer_event(transfer, old_status)
        return await self._get_transfer_enriched(transfer.id)

    async def mark_in_transit(self, transfer_id: uuid.UUID, current_user: User) -> TransferRequest:
        """
        IN_TRANSIT: APPROVED → IN_TRANSIT
        Allowed: ADMIN or the SOURCE site's SITE_ACCOUNTABLE.
        The source site confirms the goods have been physically dispatched.
        No stock movement at this step.
        """
        transfer = await self._get_transfer(transfer_id)
        self._assert_transition(transfer, TransferStatus.IN_TRANSIT)

        # Authorization: ADMIN or SOURCE site's SITE_ACCOUNTABLE
        await self._assert_is_source_site_actor(transfer, current_user)

        old_status = transfer.status
        transfer.status = TransferStatus.IN_TRANSIT
        self.session.add(transfer)

        await self._log_history(
            transfer=transfer,
            to_status=TransferStatus.IN_TRANSIT,
            changed_by=current_user.id,
            from_status=old_status,
            note=f"Dispatched by {current_user.email}. Items are now in transit to the target site.",
        )
        await self.session.commit()

        await self._publish_transfer_event(transfer, old_status)
        return await self._get_transfer_enriched(transfer.id)

    async def receive(
        self, transfer_id: uuid.UUID, current_user: User
    ) -> TransferRequest:
        """
        RECEIVE: IN_TRANSIT → RECEIVED
        Allowed: ADMIN, the TARGET site's SITE_ACCOUNTABLE, or any TECHNICIAN
        assigned to the target site.
        Atomically increments target site stock.
        """
        transfer = await self._get_transfer(transfer_id)
        self._assert_transition(transfer, TransferStatus.RECEIVED)

        # Authorization: ADMIN, target SITE_ACCOUNTABLE, or TECHNICIAN at target site
        await self._assert_is_target_site_actor(transfer, current_user)

        # 🔒 Lock target stock row and increment
        target_stock = await self._get_stock_for_update(
            transfer.target_site_id, transfer.item_id, label="target site"
        )
        old_status = transfer.status
        target_stock.quantity_available += transfer.quantity
        transfer.status = TransferStatus.RECEIVED

        self.session.add(target_stock)
        self.session.add(transfer)

        await self._log_history(
            transfer=transfer,
            to_status=TransferStatus.RECEIVED,
            changed_by=current_user.id,
            from_status=old_status,
            note=f"Receipt confirmed by {current_user.email}. {transfer.quantity} units added to target site stock.",
        )
        await self.session.commit()

        # Post-commit: publish low-stock alert if threshold breached at target
        await self.session.refresh(target_stock)
        if target_stock.quantity_available < target_stock.min_safety_threshold:
            await self.redis.publish(
                RedisChannels.LOW_STOCK_ALERT,
                json.dumps({
                    "site_id": str(transfer.target_site_id),
                    "item_id": str(transfer.item_id),
                    "quantity_available": target_stock.quantity_available,
                    "min_safety_threshold": target_stock.min_safety_threshold,
                    "trigger": "post_receive",
                }),
            )

        await self._publish_transfer_event(transfer, old_status)
        return await self._get_transfer_enriched(transfer.id)

    async def cancel(
        self, transfer_id: uuid.UUID, current_user: User
    ) -> TransferRequest:
        """
        CANCEL: REQUESTED/APPROVED/IN_TRANSIT → CANCELLED
        - ADMIN: can cancel from any state.
        - Creator: can only cancel REQUESTED transfers.
        - If APPROVED or IN_TRANSIT, source stock is rolled back atomically.
        """
        stock_needs_rollback = False

        transfer = await self._get_transfer(transfer_id)
        self._assert_transition(transfer, TransferStatus.CANCELLED)

        if current_user.role != UserRole.ADMIN:
            if transfer.status != TransferStatus.REQUESTED:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only ADMIN can cancel an approved or in-transit transfer",
                )
            if transfer.created_by != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only cancel your own transfer requests",
                )

        old_status = transfer.status
        stock_needs_rollback = old_status in (
            TransferStatus.APPROVED, TransferStatus.IN_TRANSIT
        )

        if stock_needs_rollback:
            source_stock = await self._get_stock_for_update(
                transfer.source_site_id, transfer.item_id
            )
            source_stock.quantity_available += transfer.quantity
            self.session.add(source_stock)

        transfer.status = TransferStatus.CANCELLED
        self.session.add(transfer)

        await self._log_history(
            transfer=transfer,
            to_status=TransferStatus.CANCELLED,
            changed_by=current_user.id,
            from_status=old_status,
            note=f"Transfer cancelled by {current_user.email}." + (
                f" {transfer.quantity} units returned to source stock." if stock_needs_rollback else ""
            ),
        )
        await self.session.commit()

        await self._publish_transfer_event(transfer, old_status)
        return await self._get_transfer_enriched(transfer.id)

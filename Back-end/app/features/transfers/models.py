import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import CheckConstraint, Text, Column
from sqlmodel import SQLModel, Field, Relationship


class TransferStatus(str, Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class TransferRequest(SQLModel, table=True):
    __tablename__ = "transfer_requests"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_transfer_quantity_positive"),
        CheckConstraint("source_site_id != target_site_id", name="ck_transfer_sites_differ"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    source_site_id: uuid.UUID = Field(foreign_key="sites.id", index=True)
    target_site_id: uuid.UUID = Field(foreign_key="sites.id", index=True)
    item_id: uuid.UUID = Field(foreign_key="inventory_items.id", index=True)
    quantity: int = Field(gt=0)
    status: TransferStatus = Field(default=TransferStatus.REQUESTED, index=True)
    created_by: uuid.UUID = Field(foreign_key="users.id", index=True)
    notes: Optional[str] = Field(default=None, max_length=1024)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships (runtime — needed for eager loading)
    history: list["TransferHistory"] = Relationship(back_populates="transfer")


class TransferHistory(SQLModel, table=True):
    """Audit log — records every state transition for a transfer request."""
    __tablename__ = "transfer_history"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    transfer_id: uuid.UUID = Field(foreign_key="transfer_requests.id", index=True)
    from_status: Optional[TransferStatus] = Field(default=None)
    to_status: TransferStatus = Field(index=True)
    changed_by_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    note: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    changed_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    transfer: Optional["TransferRequest"] = Relationship(back_populates="history")

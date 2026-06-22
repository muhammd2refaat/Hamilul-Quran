import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship


class OrderStatus(str, Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RECEIVED = "RECEIVED"


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    item_name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=512)
    price: float = Field(nullable=False)
    status: OrderStatus = Field(default=OrderStatus.REQUESTED, index=True)

    supplier_id: Optional[uuid.UUID] = Field(default=None, foreign_key="suppliers.id", nullable=True, index=True)
    site_id: uuid.UUID = Field(foreign_key="sites.id", nullable=False, index=True)
    created_by_id: uuid.UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships
    created_by: "User" = Relationship()
    site: "Site" = Relationship()
    supplier: Optional["Supplier"] = Relationship()

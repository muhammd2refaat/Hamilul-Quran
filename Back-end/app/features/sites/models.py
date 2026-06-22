import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship


class Site(SQLModel, table=True):
    __tablename__ = "sites"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    name: str = Field(max_length=255, index=True)
    location: str = Field(max_length=512)
    accountable_user_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
        index=True,
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships
    if TYPE_CHECKING:
        from app.features.users.models import User
        from app.features.inventory.models import InventoryStock
        from app.features.transfers.models import TransferRequest

        accountable_user: Optional["User"] = Relationship(back_populates="managed_sites")
        stock: list["InventoryStock"] = Relationship(back_populates="site")

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship


class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    company_name: str = Field(max_length=255, index=True)
    contact_name: str = Field(max_length=255)
    email: str = Field(max_length=255, index=True)
    phone: str = Field(max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships
    if TYPE_CHECKING:
        from app.features.inventory.models import InventoryItem
        items: list["InventoryItem"] = Relationship(back_populates="supplier")

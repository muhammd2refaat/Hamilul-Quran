import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column, Integer, CheckConstraint, UniqueConstraint, PrimaryKeyConstraint
from sqlmodel import SQLModel, Field, Relationship


class MainCategory(str, Enum):
    SPARE_PARTS = "SPARE_PARTS"
    TOOLS = "TOOLS"
    SAFETY_EQUIPMENT = "SAFETY_EQUIPMENT"


class SubCategory(str, Enum):
    INVERTER = "INVERTER"
    DC_CABLE = "DC_CABLE"
    AC_CABLE = "AC_CABLE"
    PANEL = "PANEL"
    BREAKER = "BREAKER"
    CLAMP_METER = "CLAMP_METER"
    AVO_METER = "AVO_METER"
    FIRST_AID_KIT = "FIRST_AID_KIT"
    SAFETY_HARNESS = "SAFETY_HARNESS"
    OTHER = "OTHER"


class InventoryItem(SQLModel, table=True):
    __tablename__ = "inventory_items"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    name: str = Field(max_length=255, index=True)
    main_category: MainCategory = Field(index=True)
    sub_category: SubCategory = Field(index=True)
    model_number: str = Field(max_length=100, index=True)
    supplier_id: uuid.UUID = Field(foreign_key="suppliers.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships
    if TYPE_CHECKING:
        from app.features.suppliers.models import Supplier
        supplier: Optional["Supplier"] = Relationship(back_populates="items")
        stock_entries: list["InventoryStock"] = Relationship(back_populates="item")


class InventoryStock(SQLModel, table=True):
    """
    Composite PK (site_id, item_id) — one stock record per item per site.
    Quantity constraints enforced at DB level via CheckConstraints.
    """
    __tablename__ = "inventory_stock"
    __table_args__ = (
        PrimaryKeyConstraint("site_id", "item_id"),
        CheckConstraint("quantity_available >= 0", name="ck_qty_available_non_negative"),
        CheckConstraint("quantity_faulty >= 0", name="ck_qty_faulty_non_negative"),
        CheckConstraint("min_safety_threshold >= 0", name="ck_min_threshold_non_negative"),
    )

    site_id: uuid.UUID = Field(foreign_key="sites.id", primary_key=True)
    item_id: uuid.UUID = Field(foreign_key="inventory_items.id", primary_key=True)
    quantity_available: int = Field(default=0, ge=0)
    quantity_faulty: int = Field(default=0, ge=0)
    min_safety_threshold: int = Field(default=0, ge=0)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    # Relationships
    if TYPE_CHECKING:
        from app.features.sites.models import Site
        site: Optional["Site"] = Relationship(back_populates="stock")
        item: Optional["InventoryItem"] = Relationship(back_populates="stock_entries")

"""
Solar Asset ERP — Database Seed Script
Populates the database with realistic mock data for 3 Egyptian solar plants.

Usage:
    python seed.py

Ensure the database is running and migrations are applied first:
    docker compose up -d db
    alembic upgrade head
"""

import asyncio
import uuid
from datetime import datetime, timezone

import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel

from app.core.config import settings
from app.features.users.models import User, UserRole
from app.features.sites.models import Site
from app.features.suppliers.models import Supplier
from app.features.inventory.models import InventoryItem, InventoryStock, MainCategory, SubCategory
from app.features.transfers.models import TransferRequest, TransferStatus


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


# ─── Seed Data Definitions ─────────────────────────────────────────────────────

USERS = [
    {
        "email": "admin@solar-erp.io",
        "password": "Admin@1234!",
        "role": UserRole.ADMIN,
        "name": "System Administrator",
    },
    {
        "email": "cairo.accountable@solar-erp.io",
        "password": "Cairo@1234!",
        "role": UserRole.SITE_ACCOUNTABLE,
        "name": "Cairo Site Manager",
    },
    {
        "email": "alex.accountable@solar-erp.io",
        "password": "Alex@1234!",
        "role": UserRole.SITE_ACCOUNTABLE,
        "name": "Alexandria Site Manager",
    },
    {
        "email": "aswan.accountable@solar-erp.io",
        "password": "Aswan@1234!",
        "role": UserRole.SITE_ACCOUNTABLE,
        "name": "Aswan Site Manager",
    },
    {
        "email": "procurement@solar-erp.io",
        "password": "Proc@1234!",
        "role": UserRole.PROCUREMENT,
        "name": "Procurement Officer",
    },
    {
        "email": "tech.cairo@solar-erp.io",
        "password": "Tech@1234!",
        "role": UserRole.TECHNICIAN,
        "name": "Cairo Field Technician",
    },
]

SITES_DATA = [
    {"name": "Cairo Solar Farm", "location": "10th of Ramadan City, Cairo Governorate, Egypt"},
    {"name": "Alexandria Coastal Plant", "location": "Borg El Arab Industrial Zone, Alexandria, Egypt"},
    {"name": "Aswan Desert Array", "location": "Kom Ombo, Aswan Governorate, Egypt"},
]

SUPPLIERS_DATA = [
    {
        "company_name": "Huawei Digital Power",
        "contact_name": "Ahmed Khalil",
        "email": "ahmed.khalil@huawei-power.com",
        "phone": "+86-755-28780808",
    },
    {
        "company_name": "JA Solar Holdings",
        "contact_name": "Sara Mostafa",
        "email": "sara.mostafa@jasolar.com",
        "phone": "+86-10-63721023",
    },
    {
        "company_name": "Nexans Egypt",
        "contact_name": "Mohamed Amin",
        "email": "m.amin@nexans.com.eg",
        "phone": "+20-2-27492100",
    },
    {
        "company_name": "Schneider Electric Egypt",
        "contact_name": "Layla Farouk",
        "email": "layla.farouk@se.com",
        "phone": "+20-2-22614600",
    },
    {
        "company_name": "3M Egypt Safety Division",
        "contact_name": "Omar Hassan",
        "email": "o.hassan@3m.com.eg",
        "phone": "+20-2-35354400",
    },
]


async def seed(session: AsyncSession) -> None:
    print("🌱 Starting database seed...")

    # ─── 1. Users ───────────────────────────────────────────────────────────
    print("  → Creating users...")
    created_users: dict[str, User] = {}
    for u_data in USERS:
        user = User(
            username=u_data["name"],
            email=u_data["email"],
            password_hash=_hash(u_data["password"]),
            role=u_data["role"],
        )
        session.add(user)
        created_users[u_data["email"]] = user
    await session.flush()

    # ─── 2. Sites ───────────────────────────────────────────────────────────
    print("  → Creating sites...")
    accountable_emails = [
        "cairo.accountable@solar-erp.io",
        "alex.accountable@solar-erp.io",
        "aswan.accountable@solar-erp.io",
    ]
    created_sites: list[Site] = []
    for i, site_data in enumerate(SITES_DATA):
        site = Site(
            name=site_data["name"],
            location=site_data["location"],
            accountable_user_id=created_users[accountable_emails[i]].id,
        )
        session.add(site)
        created_sites.append(site)
    await session.flush()

    # Assign Technician to Cairo Site
    tech_user = created_users["tech.cairo@solar-erp.io"]
    tech_user.site_id = created_sites[0].id
    session.add(tech_user)
    await session.flush()

    # ─── 3. Suppliers ───────────────────────────────────────────────────────
    print("  → Creating suppliers...")
    created_suppliers: list[Supplier] = []
    for s_data in SUPPLIERS_DATA:
        supplier = Supplier(**s_data)
        session.add(supplier)
        created_suppliers.append(supplier)
    await session.flush()

    # Map supplier by company name for easy lookup
    sup = {s.company_name: s for s in created_suppliers}

    # ─── 4. Inventory Items ─────────────────────────────────────────────────
    print("  → Creating inventory items...")
    items_data = [
        # Inverters — Huawei (Spare Parts)
        {"name": "Huawei SUN2000-100KTL-M1", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.INVERTER, "model_number": "SUN2000-100KTL-M1", "supplier": "Huawei Digital Power"},
        {"name": "Huawei SUN2000-50KTL-M3", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.INVERTER, "model_number": "SUN2000-50KTL-M3", "supplier": "Huawei Digital Power"},
        {"name": "Huawei SUN2000-30KTL-M3", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.INVERTER, "model_number": "SUN2000-30KTL-M3", "supplier": "Huawei Digital Power"},
        # Solar Panels — JA Solar (Spare Parts)
        {"name": "JA Solar JAM72S30 550W Mono PERC", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.PANEL, "model_number": "JAM72S30-550/MR", "supplier": "JA Solar Holdings"},
        {"name": "JA Solar JAM72D40 575W Bifacial", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.PANEL, "model_number": "JAM72D40-575/MB", "supplier": "JA Solar Holdings"},
        {"name": "JA Solar JAM66S30 500W Mono PERC", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.PANEL, "model_number": "JAM66S30-500/MR", "supplier": "JA Solar Holdings"},
        # Cables — Nexans (Spare Parts)
        {"name": "DC Solar Cable 6mm² 1500V Red", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.DC_CABLE, "model_number": "PFSP-6R-1500", "supplier": "Nexans Egypt"},
        {"name": "DC Solar Cable 4mm² 1500V Black", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.DC_CABLE, "model_number": "PFSP-4B-1500", "supplier": "Nexans Egypt"},
        {"name": "AC Underground Cable 3x95mm²", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.AC_CABLE, "model_number": "NAYY-3x95", "supplier": "Nexans Egypt"},
        # Breakers — Schneider (Spare Parts)
        {"name": "Schneider iC60N DC MCB 63A", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.BREAKER, "model_number": "A9N61527", "supplier": "Schneider Electric Egypt"},
        {"name": "Schneider Acti9 RCBO 40A 30mA", "main_category": MainCategory.SPARE_PARTS, "sub_category": SubCategory.BREAKER, "model_number": "A9D31840", "supplier": "Schneider Electric Egypt"},
        # Safety Gear — 3M (Safety Equipment)
        {"name": "3M Full-Body Safety Harness", "main_category": MainCategory.SAFETY_EQUIPMENT, "sub_category": SubCategory.SAFETY_HARNESS, "model_number": "DBI-SALA-1112956", "supplier": "3M Egypt Safety Division"},
        {"name": "3M Arc Flash PPE Kit Class 2", "main_category": MainCategory.SAFETY_EQUIPMENT, "sub_category": SubCategory.OTHER, "model_number": "3M-ARC2-KIT", "supplier": "3M Egypt Safety Division"},
        {"name": "Standard First Aid Kit", "main_category": MainCategory.SAFETY_EQUIPMENT, "sub_category": SubCategory.FIRST_AID_KIT, "model_number": "FA-100", "supplier": "3M Egypt Safety Division"},
        # Tools (Tools)
        {"name": "Fluke 376 FC True-RMS Clamp Meter", "main_category": MainCategory.TOOLS, "sub_category": SubCategory.CLAMP_METER, "model_number": "FLUKE-376-FC", "supplier": "Schneider Electric Egypt"},
        {"name": "Fluke 87V Industrial Multimeter (AVO)", "main_category": MainCategory.TOOLS, "sub_category": SubCategory.AVO_METER, "model_number": "FLUKE-87-5", "supplier": "Schneider Electric Egypt"},
    ]

    created_items: list[InventoryItem] = []
    for item_data in items_data:
        item = InventoryItem(
            name=item_data["name"],
            main_category=item_data["main_category"],
            sub_category=item_data["sub_category"],
            model_number=item_data["model_number"],
            supplier_id=sup[item_data["supplier"]].id,
        )
        session.add(item)
        created_items.append(item)
    await session.flush()

    # ─── 5. Inventory Stock (per site × item) ──────────────────────────────
    print("  → Seeding inventory stock levels per site...")
    # (site_index, item_index, qty_available, qty_faulty, min_threshold)
    stock_entries = [
        # Cairo Solar Farm — main hub, high stock
        (0, 0, 12, 1, 5),   # Huawei 100KTL
        (0, 1, 8, 0, 3),    # Huawei 50KTL
        (0, 3, 500, 20, 100),  # JA 550W Panel
        (0, 4, 300, 5, 50),    # JA 575W Bifacial
        (0, 6, 2000, 50, 200),  # DC Cable 6mm Red
        (0, 7, 1500, 30, 150),  # DC Cable 4mm Black
        (0, 9, 40, 2, 10),  # Schneider MCB
        (0, 11, 15, 0, 5),  # Safety Harness
        (0, 12, 8, 0, 3),   # Arc Flash Kit

        # Alexandria Coastal Plant — mid-size
        (1, 0, 6, 0, 3),    # Huawei 100KTL
        (1, 2, 10, 1, 4),   # Huawei 30KTL
        (1, 3, 250, 10, 80),  # JA 550W Panel
        (1, 5, 200, 8, 60),   # JA 500W Panel
        (1, 7, 800, 15, 100),  # DC Cable 4mm
        (1, 8, 500, 10, 80),   # AC Underground
        (1, 10, 20, 1, 5),   # Schneider RCBO
        (1, 11, 8, 0, 3),   # Safety Harness

        # Aswan Desert Array — remote site, lean stock
        (2, 1, 4, 0, 2),    # Huawei 50KTL
        (2, 2, 5, 1, 2),    # Huawei 30KTL
        (2, 3, 150, 5, 50),   # JA 550W Panel
        (2, 6, 500, 20, 100),  # DC Cable 6mm Red
        (2, 9, 15, 0, 5),   # Schneider MCB
        (2, 11, 5, 0, 2),   # Safety Harness
        (2, 12, 3, 0, 2),   # Arc Flash Kit
    ]

    for site_idx, item_idx, qty_avail, qty_faulty, min_thresh in stock_entries:
        stock = InventoryStock(
            site_id=created_sites[site_idx].id,
            item_id=created_items[item_idx].id,
            quantity_available=qty_avail,
            quantity_faulty=qty_faulty,
            min_safety_threshold=min_thresh,
        )
        session.add(stock)

    await session.flush()

    # ─── 6. Sample Transfer Request ────────────────────────────────────────
    print("  → Creating sample transfer request...")
    sample_transfer = TransferRequest(
        source_site_id=created_sites[0].id,   # Cairo → Aswan
        target_site_id=created_sites[2].id,
        item_id=created_items[0].id,          # Huawei 100KTL
        quantity=2,
        status=TransferStatus.REQUESTED,
        created_by=created_users["cairo.accountable@solar-erp.io"].id,
        notes="Aswan expansion Q1 — 2 inverters required urgently",
    )
    session.add(sample_transfer)

    await session.commit()
    print("\n✅ Seed complete! Summary:")
    print(f"   Users:            {len(USERS)}")
    print(f"   Sites:            {len(SITES_DATA)}")
    print(f"   Suppliers:        {len(SUPPLIERS_DATA)}")
    print(f"   Inventory Items:  {len(items_data)}")
    print(f"   Stock Entries:    {len(stock_entries)}")
    print(f"   Transfers:        1 sample (REQUESTED)")
    print("\n🔑 Admin Credentials:")
    print(f"   Email:    admin@solar-erp.io")
    print(f"   Password: Admin@1234!")


async def main() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        await seed(session)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

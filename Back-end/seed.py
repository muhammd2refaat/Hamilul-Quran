"""
Hamilul-Quran — Database Seed Script
Populates the database with the initial Admin user.

Usage:
    python seed.py
"""

import asyncio
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.features.users.models import User, UserRole, UserStatus

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

USERS = [
    {
        "email": "admin@qvhealth.com",
        "password": "Admin@123456",
        "role": UserRole.ADMIN,
        "name": "System Administrator",
    },
]

async def seed(session: AsyncSession) -> None:
    print("🌱 Starting database seed...")

    # 1. Users
    print("  → Creating users...")
    for u_data in USERS:
        user = User(
            username=u_data["name"].replace(" ", "").lower(),
            email=u_data["email"],
            first_name="System",
            last_name="Administrator",
            password_hash=_hash(u_data["password"]),
            role=u_data["role"],
            status=UserStatus.ACTIVE,
        )
        session.add(user)
    
    await session.commit()
    print("\n✅ Seed complete! Summary:")
    print(f"   Users:            {len(USERS)}")
    print("\n🔑 Admin Credentials:")
    print(f"   Email:    admin@qvhealth.com")
    print(f"   Password: Admin@123456")

async def main() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        await seed(session)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

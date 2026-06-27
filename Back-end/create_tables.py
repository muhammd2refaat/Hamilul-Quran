import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.features.users.models import SQLModel

async def main():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI.unicode_string())
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    print("Tables created successfully")

if __name__ == "__main__":
    asyncio.run(main())

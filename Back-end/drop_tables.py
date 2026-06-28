import asyncio
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.features.users.models import SQLModel
from app.features.complaints.models import SQLModel as CSM
from app.features.sessions.models import SQLModel as SSM
from app.features.allocations.models import SQLModel as ASM

async def main():
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    print("Tables dropped successfully")

if __name__ == "__main__":
    asyncio.run(main())

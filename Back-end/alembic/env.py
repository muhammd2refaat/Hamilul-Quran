import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# ─── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ─── Import ALL models so Alembic can detect them ─────────────────────────────
# This import triggers all SQLModel table registrations
from app.core.config import settings  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

# Import every model module to ensure tables are registered with SQLModel.metadata
import app.features.users.models  # noqa: F401
import app.features.sites.models  # noqa: F401
import app.features.suppliers.models  # noqa: F401
import app.features.inventory.models  # noqa: F401
import app.features.transfers.models  # noqa: F401
import app.features.orders.models  # noqa: F401

target_metadata = SQLModel.metadata

# Override sqlalchemy.url with the value from settings
config.set_main_option("sqlalchemy.url", settings.database_url)


# ─── Offline migrations ────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ─── Online migrations (async) ─────────────────────────────────────────────────
def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        settings.database_url,
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

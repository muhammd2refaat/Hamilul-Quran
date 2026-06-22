from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.config.settings import settings
from app.infrastructure.redis.client import get_redis_pool, close_redis_pool
from app.core.handlers import register_exception_handlers
from app.middleware.cors import register_cors


# ─── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up Redis pool
    await get_redis_pool()
    yield
    # Shutdown: close Redis pool
    await close_redis_pool()


# ─── App Factory ───────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description=(
            "Enterprise backend API for managing solar equipment assets, "
            "inventory stock levels, supplier procurement, and inter-site "
            "equipment transfers with strict ACID guarantees."
        ),
        version="1.0.0",
        docs_url=f"{settings.api_prefix}/docs",
        redoc_url=f"{settings.api_prefix}/redoc",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )

    # ─── CORS ──────────────────────────────────────────────────────────────────
    register_cors(app)

    # ─── Exception Handlers ────────────────────────────────────────────────────
    register_exception_handlers(app)

    # ─── Routers (registered after Step 3/4/5) ─────────────────────────────────
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    prefix = settings.api_prefix

    # Health check (no auth required)
    from app.core.health import router as health_router
    app.include_router(health_router, prefix=prefix)

    # Auth
    from app.features.auth.router import router as auth_router
    app.include_router(auth_router, prefix=prefix, tags=["Authentication"])

    # Users
    from app.features.users.router import router as users_router
    app.include_router(users_router, prefix=prefix, tags=["Users"])

    # Sites
    from app.features.sites.router import router as sites_router
    app.include_router(sites_router, prefix=prefix, tags=["Sites"])

    # Suppliers
    from app.features.suppliers.router import router as suppliers_router
    app.include_router(suppliers_router, prefix=prefix, tags=["Suppliers"])

    # Inventory
    from app.features.inventory.router import router as inventory_router
    app.include_router(inventory_router, prefix=prefix, tags=["Inventory"])

    # Transfers
    from app.features.transfers.router import router as transfers_router
    app.include_router(transfers_router, prefix=prefix, tags=["Transfers"])

    # Orders
    from app.features.orders.router import router as orders_router
    app.include_router(orders_router, prefix=prefix, tags=["Orders"])


app = create_app()

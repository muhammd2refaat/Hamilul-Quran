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
            "Backend API for Hamilul-Quran platform."
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


app = create_app()

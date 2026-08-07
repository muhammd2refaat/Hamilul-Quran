from fastapi import FastAPI
from contextlib import asynccontextmanager
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config.settings import settings
from app.infrastructure.redis.client import get_redis_pool, close_redis_pool
from app.core.error_tracking import init_error_tracking
from app.core.handlers import register_exception_handlers
from app.core.rate_limit import limiter
from app.middleware.cors import register_cors

init_error_tracking()


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
    # Swagger/ReDoc/the raw OpenAPI schema expose every route, request/response
    # shape, and auth scheme — fine for dev/staging, not for a public prod API.
    is_production = settings.app_env == "production"

    app = FastAPI(
        title=settings.app_name,
        description=(
            "Backend API for Hamilul-Quran platform."
        ),
        version="1.0.0",
        docs_url=None if is_production else f"{settings.api_prefix}/docs",
        redoc_url=None if is_production else f"{settings.api_prefix}/redoc",
        openapi_url=None if is_production else f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )

    # ─── Rate limiting ──────────────────────────────────────────────────────────
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    # ─── Session (Authlib OAuth state/nonce) ───────────────────────────────────
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        same_site="lax",
        https_only=settings.app_env == "production",
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

    # Allocations
    from app.features.allocations.router import router as allocations_router
    app.include_router(allocations_router, prefix=prefix, tags=["Allocations"])

    # Complaints
    from app.features.complaints.router import router as complaints_router
    app.include_router(complaints_router, prefix=prefix, tags=["Complaints"])

    # Dashboard
    from app.features.dashboard.router import router as dashboard_router
    app.include_router(dashboard_router, prefix=prefix, tags=["Dashboard"])

    # Admins
    from app.features.admins.router import router as admins_router
    app.include_router(admins_router, prefix=prefix, tags=["Admins"])

    # Session scores (write path)
    from app.features.sessions.router import router as sessions_router
    app.include_router(sessions_router, prefix=prefix, tags=["Sessions"])

    # Attendance (Join-button click tracking)
    from app.features.sessions.attendance_router import router as attendance_router
    app.include_router(attendance_router, prefix=prefix, tags=["Attendance"])

    # Teachers (profile + reviews)
    from app.features.teachers.router import router as teachers_router
    app.include_router(teachers_router, prefix=prefix, tags=["Teachers"])

    # Requests (reschedule / enrollment / teacher-change / pause)
    from app.features.requests.router import router as requests_router
    app.include_router(requests_router, prefix=prefix, tags=["Requests"])

    # Calendar (Google Calendar-backed upcoming sessions)
    from app.features.calendar.router import router as calendar_router
    app.include_router(calendar_router, prefix=prefix, tags=["Calendar"])

    # Subscriptions (per-student plan/status)
    from app.features.subscriptions.router import router as subscriptions_router
    app.include_router(subscriptions_router, prefix=prefix, tags=["Subscriptions"])

    # Receipts (student payment-screenshot uploads, 30-day retention)
    from app.features.receipts.router import router as receipts_router
    app.include_router(receipts_router, prefix=prefix, tags=["Receipts"])


from fastapi.responses import RedirectResponse

app = create_app()

@app.get("/", include_in_schema=False)
async def root():
    """Redirect the root URL to the Swagger documentation (dev/staging only —
    docs are disabled entirely in production, see create_app())."""
    if settings.app_env == "production":
        return RedirectResponse(url=f"{settings.api_prefix}/health")
    return RedirectResponse(url=f"{settings.api_prefix}/docs")

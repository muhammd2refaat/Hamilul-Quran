import asyncio
import contextlib
import logging

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

logger = logging.getLogger(__name__)

init_error_tracking()


# ─── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up Redis pool
    await get_redis_pool()
    finalizer = None
    if settings.attendance_outcomes_start_date is not None:
        finalizer = asyncio.create_task(_attendance_finalizer_loop())
    yield
    if finalizer is not None:
        finalizer.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await finalizer
    # Shutdown: close Redis pool
    await close_redis_pool()


async def _attendance_finalizer_loop() -> None:
    """Record outcomes (missed / no-show) for lessons that have ended, then
    re-sync each student's schedule end (and calendar series).
    Every Uvicorn worker runs this loop; a short Redis lock lets one worker
    do a pass at a time, so two workers never restart the same calendar
    series twice (the outcome table's unique constraint already makes the
    finalization itself safe — see AttendanceOutcomeService)."""
    from app.database.session import AsyncSessionFactory
    from app.features.sessions.outcomes import AttendanceOutcomeService
    from app.features.sessions.schedule import ScheduleService

    while True:
        try:
            redis = await get_redis_pool()
            if not await redis.set("elhafazah:lesson-sync-lock", "1", nx=True, ex=300):
                await asyncio.sleep(settings.attendance_finalizer_interval_seconds)
                continue
            async with AsyncSessionFactory() as session:
                n = await AttendanceOutcomeService(session).finalize_due()
                if n:
                    logger.info("Recorded %d lesson outcome(s)", n)
                # Also catches subscription changes made outside the API, and
                # sets the end date on allocations from before it existed.
                await ScheduleService(session).sync_all()
            await redis.delete("elhafazah:lesson-sync-lock")
        except Exception:
            logger.warning("Lesson outcome finalization failed", exc_info=True)
        await asyncio.sleep(settings.attendance_finalizer_interval_seconds)


# ─── App Factory ───────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    # Swagger/ReDoc/the raw OpenAPI schema expose every route, request/response
    # shape, and auth scheme — fine for dev/staging, not for a public prod API.
    is_production = settings.app_env == "production"

    app = FastAPI(
        title=settings.app_name,
        description=(
            "Backend API for the Elhafazah Academy platform."
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
    from app.features.teachers.router import router as teachers_router, lesson_reviews_router
    app.include_router(teachers_router, prefix=prefix, tags=["Teachers"])
    app.include_router(lesson_reviews_router, prefix=prefix, tags=["Teachers"])

    # Requests (reschedule / enrollment / teacher-change / pause)
    from app.features.requests.router import router as requests_router
    app.include_router(requests_router, prefix=prefix, tags=["Requests"])

    # Calendar (Google Calendar-backed upcoming sessions)
    from app.features.calendar.router import router as calendar_router
    app.include_router(calendar_router, prefix=prefix, tags=["Calendar"])

    # Subscriptions (per-student plan/status) + Plans (the plan catalog itself)
    from app.features.subscriptions.router import router as subscriptions_router, plans_router
    app.include_router(subscriptions_router, prefix=prefix, tags=["Subscriptions"])
    app.include_router(plans_router, prefix=prefix, tags=["Plans"])

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

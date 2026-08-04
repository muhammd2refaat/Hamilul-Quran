"""
core/error_tracking.py
=======================
Optional Sentry integration. No-ops entirely unless SENTRY_DSN is set —
safe to leave uncalled/unconfigured, and adds no dependency on an external
service being reachable at startup.
"""
import logging

from app.config.settings import settings

logger = logging.getLogger(__name__)


def init_error_tracking() -> None:
    if not settings.sentry_dsn:
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        # Conservative default — raise via SENTRY_TRACES_SAMPLE_RATE env var
        # (picked up automatically by sentry-sdk) if request tracing is wanted.
        traces_sample_rate=0.0,
        send_default_pii=False,
    )
    logger.info("Sentry error tracking initialized (environment=%s)", settings.app_env)

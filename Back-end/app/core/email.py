"""Minimal outbound email helper — plain smtplib run off the event loop, no
extra dependency. Best-effort: send_email() never raises, so a mail-server
hiccup (or SMTP simply not being configured yet) can never break whatever
feature triggered the notification.

Abuse protection: every send is counted against a daily budget kept in
Redis (shared by all workers), so a flood of form submissions can't use up
the mail account's daily limit and silence the emails that matter:

  priority="normal"  welcome, trial confirmations, contact-form copies —
                     stop at settings.email_normal_cutoff, and at most
                     email_per_recipient_hourly / _daily to one outside
                     address
  priority="high"    reset codes, temporary passwords, lesson alerts —
                     only stop at settings.email_daily_cap

The first time normal emails are paused in a day, the academy inbox gets
one warning. If Redis can't be reached, emails go out uncounted.
"""
import asyncio
import hashlib
import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Literal

from app.config.settings import settings
from app.infrastructure.redis.client import get_redis_pool

logger = logging.getLogger(__name__)

Priority = Literal["normal", "high"]

_PREFIX = "elhafazah:email"


def _send_sync(to_email: str, subject: str, body: str, html_body: str | None) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email or settings.smtp_username
    msg["To"] = to_email
    # Plain-text body is always set — it's the fallback for clients that
    # can't render HTML, and required either way for a valid message body.
    msg.set_content(body)
    if html_body:
        # Turns this into a proper multipart/alternative message (text part
        # kept above, HTML added as the preferred alternative) rather than
        # replacing it — most clients render the HTML part when present.
        msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(msg)


def _academy_inboxes() -> set[str]:
    return {
        e.lower()
        for e in (settings.contact_notification_email, settings.admin_email, settings.super_admin_recovery_email)
        if e
    }


def _day() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d")


async def _reserve(redis, to_email: str, priority: Priority) -> str | None:
    """Count this email against the budgets. Returns None when it may be
    sent, otherwise why it's blocked."""
    day = _day()
    total_key = f"{_PREFIX}:sent:{day}"
    count = await redis.incr(total_key)
    if count == 1:
        await redis.expire(total_key, 2 * 86400)
    limit = settings.email_daily_cap if priority == "high" else settings.email_normal_cutoff
    if count > limit:
        await redis.decr(total_key)
        return "daily budget"

    if priority == "normal" and to_email.lower() not in _academy_inboxes():
        who = hashlib.sha256(to_email.lower().encode()).hexdigest()[:16]
        hour = datetime.now(timezone.utc).strftime("%Y%m%d%H")
        for key, cap, ttl in (
            (f"{_PREFIX}:to:{who}:{hour}", settings.email_per_recipient_hourly, 3600),
            (f"{_PREFIX}:to:{who}:{day}", settings.email_per_recipient_daily, 86400),
        ):
            n = await redis.incr(key)
            if n == 1:
                await redis.expire(key, ttl)
            if n > cap:
                await redis.decr(total_key)
                return "per-recipient limit"
    return None


async def _warn_once(redis, sent_today: int) -> None:
    """One email a day to the academy inbox when normal emails are paused."""
    if not await redis.set(f"{_PREFIX}:warned:{_day()}", "1", nx=True, ex=2 * 86400):
        return
    to_email = settings.contact_notification_email or settings.admin_email
    body = (
        f"The platform has sent {sent_today} emails today, so it has paused normal emails "
        "(welcome, free-trial confirmations, contact-form copies) until tomorrow (UTC) "
        "to stay under the mail account's daily limit.\n\n"
        "Important emails (password codes, temporary passwords, lesson alerts) still go out "
        f"until {settings.email_daily_cap} a day.\n\n"
        "If this wasn't expected, someone may be abusing a public form.\n\n— Elhafazah Academy"
    )
    try:
        await asyncio.to_thread(_send_sync, to_email, "[Elhafazah] Email limit reached for today", body, None)
    except Exception:
        logger.exception("Failed to send the email-limit warning")


async def email_usage() -> dict:
    """Today's counters, for the admin panel."""
    redis = await get_redis_pool()
    day = _day()
    sent = await redis.get(f"{_PREFIX}:sent:{day}")
    blocked = await redis.get(f"{_PREFIX}:blocked:{day}")
    return {
        "sent_today": int(sent or 0),
        "blocked_today": int(blocked or 0),
        "normal_cutoff": settings.email_normal_cutoff,
        "daily_cap": settings.email_daily_cap,
        "enabled": bool(settings.smtp_host),
    }


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: str | None = None,
    *,
    priority: Priority = "normal",
) -> bool:
    """Fire-and-forget email. No-op (logged) if SMTP_HOST isn't set. Pass
    html_body for a styled version — body (plain text) is still required as
    the fallback part of the multipart message. Returns whether it was sent."""
    if not settings.smtp_host:
        logger.info("Email not sent (SMTP not configured): %r -> %s", subject, to_email)
        return False

    redis = None
    try:
        redis = await get_redis_pool()
        blocked = await _reserve(redis, to_email, priority)
    except Exception:
        logger.warning("Email budget unavailable (Redis); sending uncounted", exc_info=True)
        redis, blocked = None, None
    if blocked:
        logger.warning("Email blocked (%s, %s): %r -> %s", blocked, priority, subject, to_email)
        try:
            key = f"{_PREFIX}:blocked:{_day()}"
            if await redis.incr(key) == 1:
                await redis.expire(key, 2 * 86400)
            if blocked == "daily budget":
                await _warn_once(redis, int(await redis.get(f"{_PREFIX}:sent:{_day()}") or 0))
        except Exception:
            logger.warning("Could not record a blocked email", exc_info=True)
        return False

    try:
        await asyncio.to_thread(_send_sync, to_email, subject, body, html_body)
        return True
    except Exception:
        logger.exception("Failed to send notification email to %s", to_email)
        if redis is not None:
            try:
                await redis.decr(f"{_PREFIX}:sent:{_day()}")
            except Exception:
                pass
        return False

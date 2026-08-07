"""Minimal outbound email helper — plain smtplib run off the event loop, no
extra dependency. Best-effort: send_email() never raises, so a mail-server
hiccup (or SMTP simply not being configured yet) can never break whatever
feature triggered the notification.
"""
import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config.settings import settings

logger = logging.getLogger(__name__)


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


async def send_email(
    to_email: str, subject: str, body: str, html_body: str | None = None
) -> None:
    """Fire-and-forget notification email. No-op (logged) if SMTP_HOST isn't
    set. Pass html_body for a styled version — body (plain text) is still
    required as the fallback part of the multipart message."""
    if not settings.smtp_host:
        logger.info("Email not sent (SMTP not configured): %r -> %s", subject, to_email)
        return
    try:
        await asyncio.to_thread(_send_sync, to_email, subject, body, html_body)
    except Exception:
        logger.exception("Failed to send notification email to %s", to_email)

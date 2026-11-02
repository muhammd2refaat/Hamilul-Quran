"""Email abuse protection (app/core/email.py) and the free-trial form's bot
traps."""
import pytest
from sqlmodel import select

from app.config.settings import settings
from app.core import email as email_mod
from app.features.requests import service as requests_service
from app.features.requests.models import PlatformRequest


@pytest.fixture
def outbox(monkeypatch, fake_redis):
    """SMTP 'configured', sends captured, the budget kept in the fake Redis."""
    sent = []
    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(settings, "contact_notification_email", "office@apitest.dev")
    monkeypatch.setattr(settings, "email_normal_cutoff", 3)
    monkeypatch.setattr(settings, "email_daily_cap", 5)
    monkeypatch.setattr(settings, "email_per_recipient_hourly", 2)
    monkeypatch.setattr(settings, "email_per_recipient_daily", 3)
    monkeypatch.setattr(email_mod, "_send_sync", lambda to, subject, body, html: sent.append((to, subject)))

    async def pool():
        return fake_redis

    monkeypatch.setattr(email_mod, "get_redis_pool", pool)
    return sent


@pytest.mark.asyncio
async def test_normal_emails_stop_at_the_cutoff_and_important_ones_continue(outbox):
    for i in range(4):
        await email_mod.send_email(f"person{i}@apitest.dev", "Welcome", "hi")
    assert len([s for s in outbox if s[1] == "Welcome"]) == 3
    # One warning to the academy inbox, once.
    assert [s for s in outbox if "limit" in s[1]] == [("office@apitest.dev", "[Elhafazah] Email limit reached for today")]

    assert await email_mod.send_email("admin@apitest.dev", "Code", "123456", priority="high")
    assert await email_mod.send_email("admin@apitest.dev", "Code", "123456", priority="high")
    assert not await email_mod.send_email("admin@apitest.dev", "Code", "123456", priority="high")  # cap: 5

    await email_mod.send_email("late@apitest.dev", "Welcome", "hi")
    assert len([s for s in outbox if "limit" in s[1]]) == 1

    usage = await email_mod.email_usage()
    assert usage["sent_today"] == 5 and usage["blocked_today"] == 3


@pytest.mark.asyncio
async def test_one_outside_address_gets_only_a_few_emails(outbox, monkeypatch):
    monkeypatch.setattr(settings, "email_normal_cutoff", 100)
    monkeypatch.setattr(settings, "email_daily_cap", 100)
    results = [await email_mod.send_email("victim@apitest.dev", "Trial", "hi") for _ in range(4)]
    assert results == [True, True, False, False]  # 2 an hour

    # The academy's own inbox isn't capped this way.
    for _ in range(4):
        assert await email_mod.send_email("office@apitest.dev", "New request", "hi")


@pytest.mark.asyncio
async def test_a_failed_send_is_not_counted(outbox, monkeypatch, fake_redis):
    def boom(*args):
        raise OSError("smtp down")

    monkeypatch.setattr(email_mod, "_send_sync", boom)
    assert not await email_mod.send_email("a@apitest.dev", "x", "y")
    assert (await email_mod.email_usage())["sent_today"] == 0


@pytest.mark.asyncio
async def test_emails_still_go_out_if_redis_is_down(outbox, monkeypatch):
    async def broken():
        raise ConnectionError("no redis")

    monkeypatch.setattr(email_mod, "get_redis_pool", broken)
    assert await email_mod.send_email("a@apitest.dev", "x", "y")


@pytest.mark.asyncio
async def test_no_smtp_means_nothing_is_counted(outbox, monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "")
    assert not await email_mod.send_email("a@apitest.dev", "x", "y")
    assert outbox == []


# ─── Free-trial form bot traps ───────────────────────────────────────────────

def _trial(**extra):
    return {"full_name": "Real Person", "email": "real@apitest.dev", "phone": "+201001234567",
            "program": "Hifz", **extra}


@pytest.fixture
def trial_mails(monkeypatch):
    sent = []

    async def fake_send(to_email, subject, body, html_body=None, priority="normal"):
        sent.append(to_email)
        return True

    monkeypatch.setattr(requests_service, "send_email", fake_send)
    return sent


@pytest.mark.asyncio
@pytest.mark.parametrize("extra", [{"website": "http://spam.example"}, {"elapsed_ms": 800}])
async def test_bot_submissions_are_answered_but_dropped(client, db_session, trial_mails, extra):
    r = await client.post("/requests/public/trial", json=_trial(**extra))
    assert r.status_code == 201
    assert (await db_session.exec(select(PlatformRequest))).all() == []
    assert trial_mails == []


@pytest.mark.asyncio
@pytest.mark.parametrize("extra", [{}, {"website": "", "elapsed_ms": 9000}])
async def test_real_submissions_go_through(client, db_session, trial_mails, extra):
    r = await client.post("/requests/public/trial", json=_trial(**extra))
    assert r.status_code == 201
    assert len((await db_session.exec(select(PlatformRequest))).all()) == 1
    assert len(trial_mails) == 2  # academy inbox + confirmation to the visitor

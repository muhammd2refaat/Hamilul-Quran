# Test Suite Summary — Hamilul-Quran

Three separate automated suites, one per app, plus `test-cases.md` for
manual/exploratory passes. All three were built from scratch this pass —
none existed before except three unmaintained manual smoke scripts at
`Back-end/test_*.py` (not part of any automated run) and one stale
Playwright spec (`Frontend/tests/integration.spec.ts`, now replaced).

## How to run everything

```bash
# Backend — pytest, isolated test DB (hamilul_quran_test), no real Redis needed
cd Back-end
.venv/bin/python -m pytest tests/ -v

# Admin-CMS — Vitest + React Testing Library
cd Admin-CMS
npm test              # single run
npm run test:watch    # watch mode

# Frontend — Playwright e2e (spins up its own dev server on :3000;
# the real FastAPI backend must already be running on :8000)
cd Frontend
npm run test:e2e
```

## Coverage

| Suite | Files | Tests | What it covers |
|---|---|---|---|
| Backend (pytest) | 12 | 104 | Every route across all 12 feature routers: auth, users (incl. hard-delete cascade), allocations, complaints, requests, subscriptions, receipts, admins, teachers, sessions, calendar, dashboard — plus the Google OAuth callback/signup flow (`test_google_auth.py`, mocked token exchange). Role guards (401/403), validation errors (422), not-found (404), and the actual data round-trips. |
| Admin-CMS (Vitest + RTL) | 4 | 15 | `requestsStore`, `subscriptionsStore` (fetch/mutate logic, error handling), `RequestsPage`, `ReceiptsPage` (render, fetch-on-mount, user interaction incl. the authenticated blob-fetch-for-viewing pattern). |
| Frontend (Playwright) | 3 | 11 | Real login (student/teacher/invalid), student dashboard (new vs. allocated nav, plan page, receipt upload), teacher dashboard (roster, recording a session score) — driven through the actual UI in a real browser against the real backend. |

**Total: 130 automated tests, all passing.**

## Backend test architecture (worth knowing before extending it)

- **Isolated test database** (`hamilul_quran_test`, override via
  `TEST_DATABASE_URL`) — `tests/conftest.py` refuses to run if the DB name
  doesn't contain "test", as a guard against ever pointing at dev/prod.
- **Transaction-per-test rollback**: each test gets its own DB connection +
  outer transaction; the app code's own `session.commit()` calls become
  SAVEPOINTs (`join_transaction_mode="create_savepoint"`), so nothing a
  test does is ever visible to another test.
- **Fresh engine per test** (not a shared module-level singleton) — required
  because pytest-asyncio gives every test its own event loop by default,
  and asyncpg connections can't cross event loops. Schema setup
  (`create_all`/`drop_all`) uses its own short-lived, session-scoped engine.
- **Redis is faked** (`fakeredis`), fresh per test — no real Redis instance
  needed to run the suite, and the fake genuinely exercises the same
  get/setex/delete calls the real client would.
- **Real app, real HTTP**: tests hit the actual FastAPI app via
  `httpx.AsyncClient` + `ASGITransport` (real routing, middleware,
  dependency injection) — only the DB session and Redis client are
  swapped for test doubles. Auth is real JWTs via `create_access_token`,
  not mocked.
- **Uploads are sandboxed**: `settings.upload_dir` is monkeypatched to a
  per-test temp directory (autouse fixture) — the suite never touches the
  real `uploads/` folder.

## Real bugs this pass found and fixed

**(1) Google signup 500'd whenever Redis was down.** The pending-registration
handoff (`GoogleAuthService`) stored its blob in Redis with no fallback, so
with Redis unreachable the callback raised an uncaught `ConnectionError` →
`500 INTERNAL_SERVER_ERROR` ("Error 61 connecting to localhost:6379.
Connection refused") the moment a user tried to sign up with Google. Login
already degraded gracefully; signup didn't. Fixed with an in-memory fallback
(`_store_pending`/`_read_pending`/`_delete_pending`) mirroring the
refresh-token fallback pattern — signup now works with or without Redis
(production still uses Redis; the fallback is single-process, fine for dev).
Covered by `tests/test_google_auth.py::test_signup_works_when_redis_is_down`.

**(2) Logout did not actually revoke refresh tokens.** In
`app/features/auth/service.py::AuthService.refresh()`, the "reject if JTI
missing from Redis" `raise` was inside the *same* `try` block as the Redis
call itself. Since `HTTPException` is itself an `Exception` subclass, that
raise was being caught by the surrounding `except Exception:` — which was
only supposed to catch *Redis connectivity failures* — and silently
treated as "Redis is down, fall back to permissive mode." The result: a
refresh token kept working forever after logout, no matter how long ago
the JTI was deleted from Redis. Fixed by separating the Redis call from
the revocation check so a successful-but-empty lookup can't be swallowed
by the connectivity fallback. Caught by
`tests/test_auth.py::test_logout_revokes_refresh_token`, which failed
before the fix and passes after.

## Known gaps (intentionally not "fixed" by writing a test around them)

These are pre-existing product gaps, surfaced during test-writing but out
of scope for a test suite to silently paper over:

- **No `POST /complaints`.** Admins can list/resolve complaints; nothing
  lets a student or teacher file one. (`Back-end/PROGRESS.md` backlog.)
- **No password-reset backend.** Admin-CMS's "Forgot password?" link
  calls `POST /auth/request-password-reset`, which doesn't exist —
  confirmed live 404. This is a genuine dead-end in the current UI, not
  a test gap.
- **2FA UI is dead code.** `TwoFactorVerify`/`TwoFactorSetup`/
  `SessionManager` components exist and call `/auth/verify-2fa`,
  `/auth/2fa/setup`, `/auth/sessions` — none of which exist on the
  backend. Currently unreachable in practice (`login()` hardcodes
  `requiresTwoFactor: false`), so this is dormant, not actively broken.
- **Live Google Calendar write path** (real Meet-link creation on a real
  connected account) isn't covered by any automated test — doing so
  would require a real Google account and isn't something to script
  against without explicit sign-off. `test_calendar.py` covers the
  no-Google-credential no-op path thoroughly instead.
- **Google OAuth — the consent screen round-trip** can't be driven from a
  test (no real Google), so that half stays manual (see `test-cases.md`).
  But the part that actually matters — the *callback branching* (new vs.
  existing vs. suspended vs. hard-deleted identity, login vs. signup
  intent) and signup completion — IS automated in `test_google_auth.py` by
  mocking the token exchange. So "delete a user → they must sign up again",
  "already registered → just log in", and "suspended → account inactive"
  are all covered.

## Maintenance notes

- Backend: when adding a new feature router, add its test file to
  `Back-end/tests/`, reuse the `admin_headers` / `teacher_headers` /
  `student_headers` / `make_user` fixtures from `conftest.py`. Remember
  the error shape is `{"error_code", "message"}`, not FastAPI's default
  `{"detail"}` (global exception handlers rewrap it).
- Admin-CMS: new store/page tests go next to the file they test
  (`Foo.test.ts(x)` beside `Foo.ts(x)`), mock `@/services/api/client`,
  import `@/i18n` for real translated strings rather than mocking
  `useTranslation`.
- Frontend: new e2e specs go in `Frontend/tests/`, use the `throwawayStudent`
  / `throwawayTeacher` / `allocatedPair` fixtures from `tests/fixtures.ts`
  (never the seeded `student@example.com`/`teacher@example.com` — the
  latter is currently `SUSPENDED` and shared state makes seeded-account
  tests flaky anyway).

# Backend Progress Tracker

Kanban-style tracker for the whole Hamilul-Quran backend (not just auth).
Move items between sections as work lands — newest entries at the top of
each section. Full feature-by-feature audit done 2026-07-06.

## Backlog

Ideas / gaps identified but not started — not committed to any sprint yet.

- [ ] **Public self-service email/password signup.** There is currently NO
  `/auth/register` (or equivalent) endpoint. The only way to create a
  `LOCAL` (non-Google) account is the ADMIN-only `POST /users`, or manually
  seeded fixtures (`student@example.com`, `teacher@example.com`,
  `admin@qvhealth.com`). Every real end-user must sign up via Google today.
- [ ] **Complaint filing endpoint.** `ComplaintService` has no
  `create_complaint()` method and `complaints/router.py` has no `POST /`.
  Admins can list complaints and update their status, but no student or
  teacher can actually file one through the API — the `POST` path simply
  doesn't exist yet.
- [ ] **Teacher profile API.** `app/features/teachers/` has `models.py` and
  `service.py` but no `router.py`, and nothing registers a teachers router
  in `main.py`. `TeacherService.create_profile()` is only ever invoked
  internally during Google signup completion. There's no way to view/edit
  your own teacher profile, or for an admin to browse teachers / review
  ijazas & certificates, short of a raw DB query.
- [ ] **Write path for `teacher_history` / `session_scores`.** Read-only
  endpoints exist (`/users/me/teacher-history`, `/users/me/session-scores`,
  admin equivalents) and work, but nothing anywhere ever inserts a row into
  either table — no code records a score after a lesson, and no code writes
  a `TeacherHistory` row when a student gets assigned to a teacher. These
  endpoints will return empty lists forever until a write path is built.
- [ ] **Google Calendar event creation.** The refresh token is captured and
  stored encrypted (`google_credentials`), and
  `refresh_google_access_token()` exists in `app/features/auth/google.py`,
  but nothing ever calls it to actually create/read a Calendar event for a
  scheduled lesson. Google's app-verification reviewers check that a
  requested *sensitive* scope (`calendar.events`) is actually used — this
  likely needs at least a minimal implementation before verification passes.
- [ ] Decide whether OAuth-only accounts (`auth_provider=GOOGLE`) should be
  allowed to *also* set a local password later ("add a password" flow), or
  remain Google-only forever.
- [ ] Rate limiting / abuse protection on `/auth/google/login` and
  `/auth/google/complete-registration` (currently unprotected).
- [ ] Real automated test suite. `pytest`/`pytest-asyncio`/`httpx` are in
  `requirements.txt` but there is no discoverable pytest test directory. The
  three `test_*.py` files at the repo root (`test_api.py`,
  `test_allocations.py`, `test_complaints_api.py`) are manual `urllib`
  smoke-test scripts that require a running server + seeded admin
  credentials — they are not part of any automated suite.
- [ ] Tech debt: retire the deprecated shim modules once nothing imports
  them — `app/core/config.py`, `app/core/database.py`,
  `app/core/redis_client.py` each just re-export from the real module
  (`app/config/settings.py`, `app/database/session.py`,
  `app/infrastructure/redis/client.py`) and are marked `TODO` for removal.

## To Do (Sprint)

*(Populate with what you're committing to finish this week — suggested
picks from the Backlog above, highest-value first:)*

- [ ] Complaint filing endpoint (`POST /complaints`) — smallest gap, unblocks
  a whole feature that currently has no write path at all.
- [ ] Reconcile the drifted Alembic baseline (see note below) so a fresh
  `alembic upgrade head` works against an empty database.
- [ ] Teacher profile `GET`/`PATCH` router — at least self-view/edit.

## In Progress

*(The 1–2 things actively being coded right now — empty until you start one
of the above.)*

- [ ] —

## In Review / Testing

- [x] **Google OAuth login/signup end-to-end** — code-reviewed and
  live-tested in a real browser against real Google credentials on
  2026-07-04: unregistered-login rejection, Teacher signup with
  ijaza/certificate fields, JWT issuance, `/users/me`, `/allocations/me`,
  and token refresh all verified working. Considered **done**, moved
  below.
- [ ] **Google OAuth consent screen still in "Testing" mode** in Google
  Cloud (app name shows as "N8N-Calendar", suggesting a reused/misnamed
  Cloud project). Any Google account not manually added as a Test User gets
  a hard `403 access_denied` from Google itself, before our app is ever
  reached — this can't be fixed in code. Full checklist:
  `docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md`. Blocking dependency: needs
  the frontend deployed to a real HTTPS domain (privacy policy / homepage
  links can't be `localhost`) before submitting for verification.
- [ ] `account_inactive` / `google_identity_unavailable` OAuth error
  redirects — implemented and reachable, but not yet exercised by an actual
  browser test (only `not_registered` has been live-verified).

## Done

- **2026-07-13** — Test suite (pytest, 104 tests) + two auth bug fixes.
  Isolated `hamilul_quran_test` DB, transaction-per-test rollback, fakeredis,
  real-app httpx client (`tests/conftest.py`). Fixed two real bugs the suite
  surfaced: **(1)** Google signup 500'd when Redis was down — the
  pending-registration handoff in `GoogleAuthService` had no fallback, so a
  `redis` `ConnectionError` propagated as a 500 ("Error 61 connecting to
  localhost:6379") on every signup attempt; added an in-memory fallback
  (`_store_pending`/`_read_pending`/`_delete_pending`) so signup works with
  or without Redis, mirroring the refresh-token fallback. **(2)** Logout
  didn't revoke refresh tokens — `AuthService.refresh()` swallowed its own
  `credentials_exception` (an `HTTPException`, i.e. an `Exception`) in the
  `except Exception` meant only for Redis outages, so revoked tokens kept
  working; separated the Redis lookup from the revocation raise. Google
  callback branching (new/existing/suspended/hard-deleted identity, login
  vs signup intent) is covered by `tests/test_google_auth.py` with a mocked
  token exchange — confirms deleted-user→signup, already-registered→login,
  suspended→account_inactive.
- **2026-07-13** — Admin controls: true hard-delete, allocation edit/delete,
  subscriptions, receipts.
  - **Hard-delete users** (`UsersService.delete`,
    `app/features/users/service.py`): replaced the old suspend-only
    soft-delete with a real cascade delete — removes every child row
    (allocations, session scores, teacher history, complaints, requests,
    Google credentials, teacher profile/ijazas/reviews, subscriptions,
    receipts + their files on disk) in FK-safe order inside one
    transaction, nulls `teacher_id` on any other student who pointed at a
    deleted teacher, then deletes the user. Best-effort deletes any Google
    Calendar events tied to deleted allocations first (new `delete_event`
    in `app/features/calendar/google_calendar_client.py`), wrapped in
    try/except so a Google failure never blocks the DB delete.
    `DELETE /users/{id}` (ADMIN, 204) is unchanged at the API surface —
    only its behavior/summary changed. Admin-CMS `UserActions.tsx` confirm
    dialog now warns this is permanent instead of "sets to Suspended".
  - **Allocation edit/delete**: new `PATCH /allocations/{id}` and
    `DELETE /allocations/{id}` (ADMIN) in `app/features/allocations/`. On a
    schedule change, best-effort deletes the old Google Calendar events
    then re-runs the existing event-creation helper so new Meet links get
    generated; delete does the same cleanup before removing the row. Both
    Google calls are try/except-wrapped, never blocking. Admin-CMS
    `AllocationsPage.tsx` now has Edit (reopens the 3-step modal prefilled)
    and Delete (confirm dialog) per allocation card.
  - **Subscriptions** (new `app/features/subscriptions/`): minimal
    per-student model — `plan_name`, `status` (active/paused/withdrawn),
    `start_date`, `notes`, one row per student (`student_id` unique FK).
    `GET /subscriptions` (admin, joined with student name), `GET
    /subscriptions/me`, `PUT /subscriptions/{student_id}` (admin
    create-or-update). Admin-CMS's `SubscriptionsPage.tsx` (previously
    100% mock data) now lists real students with their subscription
    status and a "Change subscription" modal wired to the real endpoint.
    Frontend student `dashboard/student/plan/page.tsx` now shows the real
    plan name/status/start date/notes from `GET /subscriptions/me`
    (falls back to the old "pending" placeholder if no subscription row
    exists yet); the existing "request plan change" → `POST /requests`
    flow is untouched.
  - **Receipts** (new `app/features/receipts/`, entirely new feature):
    students upload a payment-screenshot image; `app/core/storage.py`
    generalized into a `save_upload()` helper (`save_certificate` and the
    new `save_receipt` are now thin wrappers over it) — receipts saved to
    `uploads/receipts/`, image-only, 10 MB cap. `POST /receipts` (student,
    multipart), `GET /receipts` (admin list, joined student names), `GET
    /receipts/me`, `GET /receipts/{id}/file` (admin or owner only — no
    public StaticFiles mount, since these are sensitive). 30-day retention
    via **lazy purge**: every list call filters `expires_at > now` and
    opportunistically deletes expired rows + their files — no scheduler.
    Admin-CMS new `ReceiptsPage.tsx` fetches the file as an authenticated
    blob (`responseType: 'blob'` → `URL.createObjectURL`, revoked on
    close) since the endpoint needs the bearer token and a plain `<img
    src>` can't send one. Frontend new
    `dashboard/student/receipts/page.tsx`: upload form (amount/note
    optional) + list of the student's own receipts with expiry date.
  - **New tables**: `subscriptions`, `receipts` — registered in
    `app/database/base.py`, created in the dev DB via `create_all`, and
    two add-only Alembic migrations written (`a1c9e4f0b3d2_subscriptions`,
    `b7d3f2a5c8e1_receipts`, chained off `f3b6c1a70e21`). While doing this,
    discovered `alembic_version` had been stuck at `d7e2a4c81f56` — the
    `requests` table (added in an earlier session) was never stamped either
    — so `alembic_version` was updated directly via SQL to the new head to
    match the DB's actual (already-`create_all`'d) state. Note: `alembic`
    the CLI/`alembic.config` the module are both unusable from a plain
    script here because this repo's own `alembic/` migrations directory
    shadows the installed package on `sys.path` when `PYTHONPATH` includes
    the repo root — use direct SQL against `alembic_version` for
    stamp-equivalent operations instead of `alembic.command.stamp`.
  - **Verified**: 23 script-level assertions (direct service calls against
    the real dev DB with throwaway rows, all cleaned up) covering cascade
    delete completeness, allocation update/delete, subscription upsert
    round-trip, and receipt create/list/lazy-expire-and-purge. Plus 18 live
    HTTP assertions against the running server (minted JWTs for the seeded
    `admin@qvhealth.com` / `student@example.com` accounts) covering the
    non-admin 403 guard, allocation PATCH/DELETE, subscription PUT/GET,
    multipart receipt upload + authenticated file download (owner and
    admin), and confirming both a suspended and a hard-deleted user get
    401 on `/users/me`. The one real Google-connected account
    (`ahmed`/`mr3118430@gmail.com`) was never referenced by any
    verification script. Admin-CMS `tsc --noEmit` + `npm run build` and
    Frontend `tsc --noEmit` + `yarn build` all pass clean.
- **2026-07-13** — Real Google Calendar integration (`app/features/calendar/`):
  `AllocationService.create` (`app/features/allocations/service.py`) now
  best-effort creates one real weekly-recurring Google Calendar event per
  `schedule[]` entry — with an auto-generated Meet link — on the **teacher's**
  connected Google Calendar, inviting the student by email. Uses direct
  `httpx` REST calls (`app/features/calendar/google_calendar_client.py`),
  reusing the existing `refresh_google_access_token` helper — no new
  dependency added. The Meet link / Google event id get written back into
  that same `schedule[]` entry (`meet_link`, `google_event_id` keys) — **no
  migration**, since `Allocation.schedule` was already a JSON column. If the
  teacher has no connected Google account (no `GoogleCredential` row, or no
  refresh token), this silently no-ops — the allocation is still created
  exactly as before, wrapped end-to-end in try/except so a Calendar/Google
  failure can never block allocation creation.
  New read endpoints project real upcoming dates from that data (never a
  live per-request Google API call, so they stay fast even for the admin
  aggregate view): `GET /calendar/me` (student sees their own upcoming
  sessions; teacher sees theirs across all students) and `GET /calendar`
  (ADMIN — every teacher's and student's upcoming sessions), both with an
  optional `?weeks=1..12` (default 4).
  Verified: unit-level date/RRULE-weekday math; a live allocation-create
  test against a teacher with **no** Google credential (confirms the
  graceful no-op path, cleaned up after); live read-only `GET /calendar/me`
  against the one real teacher account that has a connected Google Calendar
  (`ahmed`/`mr3118430@gmail.com`) — correct projected dates came back.
  **Not yet tested**: the actual live Google Calendar *write* path (real
  event + Meet link creation) — that requires creating a real event on
  `ahmed`'s actual connected Google account, which wasn't done without
  explicit go-ahead. The code path is otherwise fully exercised (same
  helpers, same request-building logic, unit-verified).
- **2026-07-06** — New `/register/required` page (matches landing-page
  design system) replaces the old inline "not registered" banner on
  `/login`; backend's `not_registered` redirect now points there instead of
  `/login`. `/login` itself was redesigned to match the landing page's
  visual language (dark green/gold, Reem Kufi/Space Grotesk) instead of the
  generic shadcn form.
- **2026-07-04** — Google OAuth login/signup confirmed working end-to-end
  in a live browser test: unregistered-login correctly rejected, Teacher
  signup completed (profile + ijazas + encrypted refresh token persisted),
  dashboard access + token refresh all functioning.
- **2026-07-03** — Real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` configured
  in `.env`.
- **2026-07-03** — Restricted Google **login** (not signup) to registered
  accounts only: if a Google account has no matching `User` row and the
  request wasn't `intent=signup`, the callback rejects it instead of
  silently doing nothing or auto-creating an account. See
  `_frontend_error()` / `handle_callback()` in
  `app/features/auth/google_service.py`.
- **2026-07-03** — Google OAuth signup/login refactor (backend-redirect,
  authorization-code flow) for Students and Teachers, including Calendar
  consent capture (`access_type=offline`, `prompt=consent`) for future
  scheduling. New tables `teacher_profiles`, `ijazas`, `google_credentials`;
  `users` gained `google_id`, `auth_provider`, `age`, nullable
  `password_hash`. Certificate upload to local filesystem (`core/storage.py`,
  10MB limit, PDF/PNG/JPEG only). Refresh tokens encrypted at rest via
  Fernet (`core/crypto.py`). Details: `docs/GOOGLE_OAUTH_REFACTOR.md`.
- **2026-07-03** — Fixed Alembic model discovery (`app/database/base.py`,
  `alembic/env.py` now import every feature model). Applied migration
  `b2f7a1c9d3e4` on top of the existing dev DB via `alembic stamp` +
  `alembic upgrade head`.
- **2026-07-03** — Fixed stale `solar_erp:` Redis key prefix and
  `.env.example` template leftovers from the original scaffold project.
- (pre-existing) Email/password auth (`/auth/login`, `/refresh`, `/logout`,
  `/me`) — JWT access + refresh tokens, Redis-backed refresh revocation,
  bcrypt password hashing.
- (pre-existing) Role-based `users` table (ADMIN/TEACHER/STUDENT) with
  admin CRUD (`list` w/ search+pagination, `create`, `get by id`, `patch`,
  suspend via `status=SUSPENDED`, hard delete — see 2026-07-13 entry above)
  plus self-profile `GET /users/me`.
- (pre-existing) Allocations: create (admin), list all (admin), list mine
  (role-filtered for student/teacher).
- (pre-existing) Complaints: list all (admin, joined with filer/subject
  names), per-user list (`/me/complaints`, admin `/{user_id}/complaints`),
  status update (admin, with auto-timestamped `resolved_at`).
- (pre-existing) Global exception handlers: `HTTPException`,
  `RequestValidationError`, `IntegrityError` (mapped to Postgres error codes
  for unique/FK violations), generic `SQLAlchemyError`, catch-all 500.
- (pre-existing) CORS middleware + Starlette `SessionMiddleware` (used by
  Authlib for OAuth state/nonce).

## Notes for future me

- `handle_callback()` in `google_service.py` treats "Google account already
  registered" the same regardless of whether the user clicked Login or
  Signup — it just logs them in either way. Only the reverse (Login clicked,
  no account exists) is rejected. That's intentional (common UX pattern) but
  worth knowing if requirements change.
- OAuth error redirects to the frontend use the query string (`?error=...`,
  plus context like `&email=...`), NOT the fragment — only the token-bearing
  success redirect (`_frontend_success`) uses the fragment, since those
  values must not appear in server logs/Referer headers.
- Migrations are add-only by convention here because the existing baseline
  (`0af01f5224fd`) is drifted from the model — don't trust `--autogenerate`
  blindly; diff it against reality first. Right now `alembic upgrade head`
  only works because the dev DB was `create_all`'d first and then stamped
  at the current head — a truly fresh/empty database will NOT migrate
  cleanly yet.
- `app/core/config.py`, `app/core/database.py`, `app/core/redis_client.py`
  are deprecated shims re-exporting from `app/config/settings.py`,
  `app/database/session.py`, and `app/infrastructure/redis/client.py`
  respectively. Prefer the non-shim imports in new code.
- Redis must be running locally (`redis-server`) for refresh-token
  revocation AND the Google signup handoff (pending registration blob is
  stored there with a TTL). Login for existing users degrades gracefully
  without Redis; new signups will hard-fail without it.

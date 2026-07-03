# Backend Progress Tracker

Living reference for auth/account work on the Hamilul-Quran backend. Update
this as work lands or plans change — newest entries at the top of each section.

## Done

- **2026-07-03** — Real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` configured
  in `.env`; Google login/signup confirmed working end-to-end.
- **2026-07-03** — Restricted Google **login** (not signup) to registered
  accounts only: if a Google account has no matching `User` row and the
  request wasn't `intent=signup`, the callback rejects it and redirects to
  `/login?error=not_registered&email=...` instead of silently doing nothing
  or auto-creating an account. See `_frontend_error()` /
  `handle_callback()` in `app/features/auth/google_service.py`.
- **2026-07-03** — Google OAuth signup/login refactor (backend-redirect,
  authorization-code flow) for Students and Teachers, including Calendar
  consent capture (`access_type=offline`, `prompt=consent`) for future
  scheduling. New tables `teacher_profiles`, `ijazas`, `google_credentials`;
  `users` gained `google_id`, `auth_provider`, `age`, nullable `password_hash`.
  Certificate upload to local filesystem. Details:
  `docs/GOOGLE_OAUTH_REFACTOR.md`.
- **2026-07-03** — Fixed Alembic model discovery (`app/database/base.py`,
  `alembic/env.py` now import every feature model). Applied migration
  `b2f7a1c9d3e4` on top of the existing dev DB via `alembic stamp` +
  `alembic upgrade head`.
- **2026-07-03** — Fixed stale `solar_erp:` Redis key prefix and
  `.env.example` template leftovers from the original scaffold project.
- (pre-existing) Email/password auth (`/auth/login`, `/refresh`, `/logout`,
  `/me`), JWT access+refresh tokens with Redis-based refresh revocation,
  role-based `users` table (ADMIN/TEACHER/STUDENT), allocations, complaints,
  session scores, teacher history features.

## In progress / needs user action

- [ ] **Redis running locally** — required for refresh-token revocation and
  the Google signup handoff. Not running as of 2026-07-03 during dev testing —
  confirm it's up before relying on the signup handoff in a fresh environment.
- [ ] Google OAuth consent screen is likely still in **Testing** mode (only
  allows pre-added test users). Needs verification/publishing in Google Cloud
  Console before arbitrary users outside the test list can sign in.

## Next up / not started

- [ ] Actual Google Calendar event creation for scheduled lessons (the
  refresh token is captured and stored encrypted, but nothing reads it yet).
  Entry point: `refresh_google_access_token()` in
  `app/features/auth/google.py`.
- [ ] Reconcile the drifted Alembic baseline (`0af01f5224fd`) so a fresh
  `alembic upgrade head` works against an empty database — right now it only
  works because the dev DB was `create_all`'d first and then stamped.
- [ ] Decide whether OAuth-only accounts (`auth_provider=GOOGLE`) should be
  allowed to *also* set a local password later (e.g. "add a password" flow),
  or remain Google-only forever.
- [ ] Admin-side visibility into teacher credentials (ijazas, certificate,
  juz memorized) — currently only written during signup, no admin
  view/endpoint to review them yet.
- [ ] Rate limiting / abuse protection on `/auth/google/login` and
  `/auth/google/complete-registration` (currently unprotected).

## Notes for future me

- `handle_callback()` in `google_service.py` treats "Google account already
  registered" the same regardless of whether the user clicked Login or
  Signup — it just logs them in either way. Only the reverse (Login clicked,
  no account exists) is rejected. That's intentional (common UX pattern) but
  worth knowing if requirements change.
- OAuth error redirects to the frontend use the query string (`?error=...`,
  plus context like `&email=...`), NOT the fragment — only the token-bearing
  success redirect (`_frontend_success`) uses the fragment, since those values
  must not appear in server logs/Referer headers.
- Migrations are add-only by convention here because the existing baseline is
  drifted from the model — don't trust `--autogenerate` blindly; diff it
  against reality first.
- `app/core/config.py` and `app/core/database.py` / `app/core/redis_client.py`
  are deprecated shims re-exporting from `app/config/settings.py` and
  `app/database/session.py` / `app/infrastructure/redis/client.py`. Prefer the
  non-shim imports in new code.

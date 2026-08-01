# Google OAuth Auth Refactor — Backend

Date: 2026-07-03

## Why

The platform needed self-service signup for Students and Teachers via Google
(instead of admin-only user creation), collecting different profile fields per
role, and needed to capture Google Calendar permission up front so future
lesson scheduling can create calendar events on a user's behalf.

## What changed

### New dependencies (`requirements.txt`)
- `authlib==1.3.2` — OAuth client for the Google authorization-code flow.
- `itsdangerous==2.2.0` — required by Starlette's `SessionMiddleware`, which
  Authlib uses to store OAuth `state`/`nonce` between the redirect and callback.

### Config (`app/config/settings.py`, `.env`, `.env.example`)
New settings: `session_secret`, `token_encryption_key`, `google_client_id`,
`google_client_secret`, `google_redirect_uri`, `google_oauth_scopes`,
`registration_token_ttl_seconds`, `frontend_url`, `upload_dir`.

Also fixed a stale Redis key prefix left over from a template project
(`solar_erp:refresh_token:` → `hamilul_quran:refresh_token:` in
`app/features/auth/service.py`).

### Database (migration `b2f7a1c9d3e4_google_oauth_and_teacher_profiles.py`)
- `users` table: `password_hash` is now **nullable** (OAuth-only accounts have
  no local password); added `google_id` (unique), `auth_provider`
  (`LOCAL`/`GOOGLE`), `age`.
- New `teacher_profiles` table (`worked_online_before`, `juz_memorized`,
  `certificate_path`) — one row per teacher.
- New `ijazas` table — one row per ijaza a teacher holds (a teacher can have
  more than one).
- New `google_credentials` table — stores each user's Google `refresh_token`
  (encrypted at rest with Fernet), `access_token`, `token_expiry`, `scopes`.
  This is what future Calendar-scheduling code will read from.

Model discovery for Alembic was also fixed: `app/database/base.py` and
`alembic/env.py` previously only imported (or had commented out) the `users`
model — they now import every feature model so `alembic revision
--autogenerate` won't silently miss tables again.

**Note on the existing DB:** the dev database was originally built with
`SQLModel.metadata.create_all` (via `create_tables.py`), not Alembic, and was
never stamped. To apply the new migration to it we ran:
```
alembic stamp 0af01f5224fd   # mark the pre-existing baseline as applied
alembic upgrade head          # apply the new migration on top
```
A fresh `alembic upgrade head` against an *empty* database will not work yet —
the original baseline migration has drifted from the actual `User` model (see
`alembic/versions/0af01f5224fd_*.py`). This is pre-existing debt, not
introduced by this change.

### New/changed backend code
| File | Purpose |
|---|---|
| `app/core/crypto.py` | Fernet encrypt/decrypt helpers for the stored Google refresh token. |
| `app/core/storage.py` | Saves uploaded teacher certificates to `uploads/certificates/` on the local filesystem (10MB limit, PDF/PNG/JPEG only). |
| `app/features/auth/google.py` | Authlib Google client registration; builds the consent redirect (`access_type=offline`, `prompt=consent` to force a refresh token); exchanges the code; `refresh_google_access_token()` for future Calendar use. |
| `app/features/auth/google_service.py` | `GoogleAuthService` — orchestrates the callback (existing user → JWTs, new user → pending registration in Redis) and `complete_registration()` (creates the `User` + teacher profile/ijazas + `GoogleCredential`). |
| `app/features/auth/models.py` | New `GoogleCredential` model. |
| `app/features/teachers/models.py` | New `TeacherProfile`, `Ijaza`, `IjazaType` models. |
| `app/features/teachers/service.py` | `TeacherService.create_profile()` — creates the profile + ijaza rows + saves the certificate. |
| `app/features/auth/router.py` | New endpoints: `GET /auth/google/login`, `GET /auth/google/callback`, `POST /auth/google/complete-registration`. |
| `app/features/auth/service.py` | Refactored token issuance into `issue_tokens_for_user()` (shared by password login and Google login/registration); `login()` now tells OAuth-only accounts to use Google instead of failing generically. |
| `app/core/dependencies.py` | Added `require_teacher` / `require_student` role guards (previously only `require_admin` existed). |
| `app/main.py` | Registered `SessionMiddleware` (needed by Authlib for OAuth state). |

### OAuth flow (backend-redirect, authorization-code)
1. Frontend → `GET /auth/google/login?intent=signup&role=student|teacher` (or `intent=login`).
2. Backend redirects to Google's consent screen requesting
   `openid email profile https://www.googleapis.com/auth/calendar.events`.
3. Google → `GET /auth/google/callback?code&state`.
   - **Existing user:** JWTs are issued and the browser is redirected to
     `FRONTEND_URL/auth/callback#access_token=...&refresh_token=...&role=...`.
   - **New user (signup):** identity + encrypted refresh token are stashed in
     Redis under a short-lived (`registration_token_ttl_seconds`, default 15
     min) opaque token; browser is redirected to
     `FRONTEND_URL/register/complete?registration_token=...&role=...`.
4. Frontend collects the remaining role-specific fields and
   `POST`s multipart form data to `/auth/google/complete-registration`, which
   creates the account and returns the usual `TokenResponse`.

Email/password `/auth/login`, `/refresh`, `/logout`, `/me` are unchanged.

## Required setup to actually test Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → create an **OAuth
   2.0 Client ID** (Web application).
   - Authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
   - Enable the **Google Calendar API** for the project.
2. Put the client ID/secret into `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
3. `SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` have already been generated in
   `.env` for local dev. Rotate them for any shared/prod environment.
4. Redis must be running (`redis-server`) — it's used for refresh-token
   revocation and for the pending-registration handoff during signup.
5. **Restart `uvicorn`** after editing `.env` — settings are cached once per
   process (`@lru_cache` in `app/config/settings.py`).

## Known follow-ups / out of scope here
- Actual Google Calendar event creation (scheduling lessons) is not
  implemented yet — only the credentials/scopes are captured and stored.
  `refresh_google_access_token()` in `app/features/auth/google.py` is the
  entry point for that work.
- The original Alembic baseline migration is drifted from the `User` model
  (see note above) — a from-scratch `alembic upgrade head` needs that
  reconciled first.

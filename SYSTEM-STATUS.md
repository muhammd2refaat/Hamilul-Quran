# System Status — Hamilul-Quran

**Last updated:** 2026-08-04
**Live at:** elhafazah-academy.com / api.elhafazah-academy.com / admin.elhafazah-academy.com (IP 72.61.96.204)

This file tracks the current state of the production deployment: what's been
fixed, what's still open, and what to do next. Update it whenever a
significant fix or deploy lands — treat it as the single source of truth for
"where do things stand right now," separate from `Back-end/PROGRESS.md`
(feature backlog) and `test-summary.md` (test coverage).

---

## Deployment log

**2026-08-04 — Security hardening deploy.** Full production audit performed
(backend, infra, frontend), 6 critical/live-exploitable findings fixed and
deployed. `docker compose down` → rebuild → `up -d`, all 6 services came back
healthy. Verified live: Traefik dashboard port closed, rate limiting active
(confirmed 429 after 10 login attempts/min), backend health endpoint green
(DB + Redis both `ok`), old leaked admin password confirmed rejected (401),
new password confirmed working (200).

---

## What's fixed (deployed and verified live)

1. **Leaked admin password rotated.** The password published in
   `Admin-CMS/CREDENTIALS.md`/`LOGIN_INFO.txt` (now deleted from the repo)
   no longer works. **The new password is in `.env.staging` on this host
   only — it is intentionally not written anywhere in this repo or in any
   committed file.** Whoever needs admin access should read it from
   `.env.staging` directly or coordinate a further rotation; do not paste it
   into a commit, issue, or chat log.
2. **App now fails to start in production with placeholder secrets.**
   `Back-end/app/config/settings.py` validates `SECRET_KEY`, `SESSION_SECRET`,
   and `ADMIN_PASSWORD` at startup when `APP_ENV=production` — a missing or
   misconfigured `.env.staging` now crashes loudly instead of silently
   signing tokens with a secret that's published in this repo's history.
3. **Traefik dashboard closed.** `api.insecure: false` in `traefik/traefik.yml`,
   `8080:8080` no longer published in `docker-compose.yml`. Confirmed:
   connections to port 8080 are refused.
4. **Google OAuth account-takeover path closed.** Login/signup no longer
   auto-links an existing account (including admin) to a Google identity
   unless Google reports `email_verified: true`.
5. **Refresh-token revocation now fails closed.** A Redis outage no longer
   re-validates previously revoked ("logged out") refresh tokens.
6. **Rate limiting added.** `/auth/login`, `/auth/swagger-login` (10/min),
   `/auth/refresh` (30/min), `/auth/google/complete-registration` (10/min)
   are now throttled per IP via `slowapi`. Confirmed live: repeated
   login attempts return `429` after the limit.

All 104 backend pytest tests pass against a real Postgres instance after
these changes (one regression was caught and fixed during verification — a
missed call site after the OAuth signature change).

---

## What's still open

### High priority (do next)
- **Authorization gaps**: a teacher can currently record a session score for
  *any* student, not just their own allocated students
  (`sessions/router.py` / `sessions/service.py`); anyone can post unlimited
  reviews on any teacher, including self-reviews
  (`teachers/router.py:110-130`); `POST /requests` trusts a client-supplied
  `from_role` with no cross-check.
- **Fresh database won't migrate.** `alembic upgrade head` against a
  brand-new empty database currently fails — the Alembic baseline has
  drifted from the models. This blocks disaster recovery and stands up new
  environments. See `Back-end/PROGRESS.md` for the team's own note on this.
- **No database backups.** Single Docker volume, no `pg_dump` cron, no
  WAL/PITR. Combined with the migration-drift issue above, a bad migration
  or host loss is currently unrecoverable.
- **Exception handlers leak internals.** `IntegrityError`/`SQLAlchemyError`/
  generic-exception handlers return raw `str(exc)` to the client, and so
  does the unauthenticated `/health` endpoint on failure.
- **Both frontends store JWTs in `localStorage`** (not `HttpOnly` cookies) —
  full token exposure on any XSS. The Frontend also never calls
  `POST /auth/logout`, so "logging out" doesn't actually revoke the refresh
  token server-side.

### Medium priority
- API docs (`/docs`, `/redoc`, `/openapi.json`) are public in production —
  should be gated on `app_env != "production"`.
- File uploads are buffered fully into memory before the size check runs
  (memory-DoS risk); content-type is trusted from the client header with no
  magic-byte verification.
- `Back-end/Dockerfile` and `Admin-CMS/Dockerfile` run as root; the backend
  image ships `drop_tables.py` and other seed/dev scripts into production.
- `dump.rdb`, `Frontend/dump.rdb`, and stray `.DS_Store` files are committed
  to git despite being gitignored now (gitignore doesn't retroactively
  untrack already-committed files).
- No resource limits, no log rotation, no error tracking (Sentry or
  equivalent), no uptime monitoring on any service.
- Live `/privacy` and `/terms` pages render a literal `[SUPPORT_EMAIL]`
  placeholder to real visitors.
- `Frontend/proxy.ts` (an attempted route-guard middleware) is dead code —
  wrong filename/export for Next.js to ever load it. All route protection is
  currently client-side only.
- Admin-CMS's "active sessions" and dashboard "user engagement" widgets
  render hardcoded mock data instead of real API calls.

### Previously missing features — now implemented (2026-08-04)

- ✅ `POST /complaints` — any authenticated user (student/teacher) can file a complaint.
  `complaint_from` is inferred from role server-side.
- ✅ Teacher public browsing API — `GET /teachers` (paginated) and `GET /teachers/{id}`
  (public `TeacherPublicResponse`). `GET /teachers/{id}/full` still restricted to self/admin.
- ✅ `teacher_history` write path — `AllocationService.create()` calls `reassign_teacher()`;
  `GET /users/me/teacher-history` now returns real data.
- ✅ Google Calendar event creation — wired into `AllocationService._try_create_calendar_events()`;
  creates recurring weekly events on teacher's Google Calendar with Meet link + student attendee.
  Best-effort (Calendar failure does not roll back the allocation).
- ✅ `POST /auth/change-password` — authenticated, LOCAL accounts only. Returns 400 for Google-only
  users and 401 for wrong current password.
- ✅ `POST /auth/password-reset/request` + `/confirm` — stateless 15-min JWT tokens.
  Request always returns 204 (no user enumeration). Token is logged to INFO; wire in
  SMTP/SendGrid delivery when email is configured.
- ✅ Admin 2FA (TOTP, Google Authenticator compatible):
  - `POST /auth/totp/setup` → returns secret + QR URI (2FA not yet active).
  - `POST /auth/totp/confirm` → verifies first code, enables 2FA.
  - `POST /auth/totp/disable` → verifies code, disables 2FA.
  - `POST /auth/login` now returns `{"totp_required": true, "temp_token": "..."}` for
    admins with 2FA enabled instead of full tokens.
  - `POST /auth/totp/verify` → exchanges temp_token + TOTP code for real access+refresh tokens.
  - DB: `users.totp_secret` (Fernet-encrypted) + `users.totp_enabled`; migration `e1a4b2c9d7f3`.
- ✅ Landing-page signup Step 3 — already fully wired in `/app/register/complete/page.tsx`;
  calls `POST /auth/google/complete-registration` correctly with all fields.

### Remaining known gap
- Password reset email delivery is stubbed (logs token to INFO). Needs SMTP/SendGrid wiring
  once an email provider is configured.


---

## Upcoming actions (suggested order)

1. **Confirm the new admin password is saved somewhere durable and secure**
   (password manager, not chat/email) — it currently exists only in
   `.env.staging` on the production host.
2. Fix the authorization gaps (session scores, teacher reviews, request
   role-spoofing) — these are exploitable by any authenticated user today.
3. Resolve the Alembic drift and stand up an actual backup job before doing
   anything else that touches the schema.
4. Move both frontends off `localStorage` for token storage, and wire the
   Frontend's logout button to actually call `POST /auth/logout`.
5. Stop leaking exception internals to clients; gate `/docs` behind
   non-production.
6. Everything else in "Medium priority" and "Known missing features" above,
   roughly in that order, as capacity allows.

# Authentication — How It Works

Explains the auth system end to end: login, signup, logout, tokens, session
lifetime, what happens with two accounts open in one browser, and the
security measures actually in place. Backend code lives in
`Back-end/app/features/auth/` (`router.py`, `service.py`, `google_service.py`,
`totp.py`) and `Back-end/app/core/` (`security.py`, `cookies.py`,
`dependencies.py`). Both `Frontend` (student/teacher) and `Admin-CMS` talk
to the same backend and the same auth mechanism — see "Two accounts, one
browser" below for the one place that matters.

## The short version

- JWT access token (30 min) + refresh token (7 days), issued as **HttpOnly
  cookies** (`access_token` / `refresh_token`) on `api.elhafazah-academy.com`.
  JS on the page can never read them — that's the point.
- Two ways in: **email/password** (`POST /auth/login`) or **Google OAuth**
  (`GET /auth/google/login`). There's no self-service password signup —
  password accounts are created by an admin; Google accounts self-register
  through the OAuth flow.
- Logout revokes the refresh token server-side (Redis) and clears both
  cookies. The already-issued access token still works until it naturally
  expires (≤30 min) — logout doesn't retroactively invalidate it.
- Admins can turn on TOTP 2FA; everyone else can't (by design).

## Login

**Email/password** — `POST /auth/login` (`auth/router.py:51`):
1. `AuthService.login()` looks up the user by email, checks `status ==
   ACTIVE`, verifies the bcrypt hash (`app/core/security.py::verify_password`,
   cost factor 12).
2. Google-only accounts (`password_hash is None`) get a 401 steering them to
   "continue with Google" instead of a generic wrong-password error.
3. **Admin with TOTP enabled** → doesn't get real tokens yet. Returns
   `{"totp_required": true, "temp_token": "..."}` — a 5-minute JWT that only
   works against `POST /auth/totp/verify` with a 6-digit code from the
   authenticator app. Real tokens are issued only after that second step.
4. Everyone else → `AuthService.issue_tokens_for_user()` mints the access +
   refresh pair immediately, and the router sets both as HttpOnly cookies on
   the response (`set_auth_cookies()`, `core/cookies.py`).

Rate-limited to **10/minute per IP** (`slowapi`, `core/rate_limit.py`) — same
limit on `/auth/swagger-login` (the Swagger-UI-only variant of this endpoint).

**Google OAuth** — `GET /auth/google/login?intent=login|signup&role=...`:
1. Stashes `intent`/`role` in the server-side session (Starlette
   `SessionMiddleware`, itself signed with `SESSION_SECRET`), redirects to
   Google's consent screen. Requests the Calendar scope up front so lesson
   scheduling (`Back-end/app/features/calendar/`) doesn't need a second
   consent later.
2. Google redirects back to `GET /auth/google/callback` with an auth code.
   `GoogleAuthService.handle_callback()` (`auth/google_service.py:58`)
   exchanges it, then branches:
   - **Existing user** (matched by `google_id`, or by verified email — see
     "Account-linking safety" below) → issues real tokens, redirects to
     `{FRONTEND_URL}/auth/callback#access_token=...&role=...` (cookies are
     also set directly on this redirect response; the URL fragment is a
     fallback for non-cookie clients and never reaches server logs, since
     fragments aren't sent over HTTP at all).
   - **No user, `intent=signup`** → doesn't create the account yet. Stashes
     a "pending registration" blob in Redis (15 min TTL,
     `REGISTRATION_TOKEN_TTL_SECONDS`) and redirects to
     `/register/complete?registration_token=...` so the frontend can collect
     role-specific fields (age/country/phone for students, certificates/ijazas
     for teachers) before the account is actually created.
   - **No user, `intent=login`** (i.e. tried to sign in with a Google account
     that was never registered) → redirected to `/register/required`, no
     account created. Google never auto-creates an account on login.

**Account-linking safety:** an incoming Google identity only gets matched to
an *existing* account by email when Google reports `email_verified: true`
(`_find_user()`, `google_service.py:178`). This closes an account-takeover
path — without it, an attacker could register any unverified Gmail-style
address and silently take over an existing account (including an admin's)
that happens to share that email.

## Signup

There is **no public `POST /users`** — creating a user is either:
- **Self-service, Google-only**: the `intent=signup` flow above, finished by
  `POST /auth/google/complete-registration` (`auth/router.py:162`), which
  validates the pending-registration token, creates the `User` row (+
  `TeacherProfile`/ijazas if role=teacher, via `TeacherService`), then
  immediately logs them in (same `issue_tokens_for_user()` as everywhere
  else). Rate-limited 10/minute.
- **Admin-created**: `POST /users` is `AdminDep`-gated
  (`features/users/router.py:48`) — only reachable from Admin-CMS. `password`
  is optional on `UserCreate`; if omitted, `UserService.create()` generates a
  random temporary one server-side.

There is no plain "register with email + password" form anywhere in the
product — password accounts always originate from an admin.

## Logout

`POST /auth/logout` (`auth/router.py:114`): deletes the refresh token's JTI
from Redis (`AuthService.logout()`) and clears both cookies
(`clear_auth_cookies()`). That's the entire server-side effect.

**What this does *not* do:** invalidate the access token already handed out.
JWTs are stateless and not blacklisted on logout — an access token obtained
before logout keeps working for whatever's left of its 30-minute lifetime.
Only the *refresh* path is actually revoked (see below), so a "logged out"
session can't silently renew itself, but a captured access token isn't
instantly dead the moment logout is clicked. This is a standard, accepted
trade-off for short-lived stateless access tokens, not an oversight — just
worth knowing rather than assuming "logout" means "immediately dead
everywhere."

## Tokens & how long a session lives

| Token | Lifetime | Where it lives | Renewable? |
|---|---|---|---|
| Access token | 30 min (`ACCESS_TOKEN_EXPIRE_MINUTES`) | `access_token` HttpOnly cookie (+ JSON body, for Swagger/non-browser clients) | No — just re-issued by a refresh |
| Refresh token | 7 days (`REFRESH_TOKEN_EXPIRE_DAYS`) | `refresh_token` HttpOnly cookie, JTI mirrored in Redis | Yes, implicitly (see below) |

Both `Frontend/lib/api.ts` and `Admin-CMS/src/services/api/client.ts` run an
Axios response interceptor: on a `401`, they silently call `POST
/auth/refresh` once (cookie-based, no body needed — `auth/router.py:90`) and
retry the original request. `AuthService.refresh()` checks the refresh JTI
is still present in Redis (i.e. not revoked), then issues a **new access
token** but **reuses the same refresh token** — it isn't rotated on every
refresh.

Net effect: as long as you keep using the app at least once every 7 days,
you effectively never see a login screen — each 401 triggers a silent
refresh, extending activity indefinitely up to the refresh token's own fixed
7-day expiry (from original login), at which point a real re-login is
required. There's no "sliding" refresh-token renewal.

**Redis is load-bearing here, and deliberately fails closed**: `refresh()`
rejects the request if Redis can't be reached to check the JTI
(`service.py:132`) rather than assuming "not revoked." A Redis outage means
nobody's refresh token can be exchanged — inconvenient (forces real re-logins)
but intentional, since the alternative (fail open) would mean a Redis outage
silently disables revocation entirely.

## Two accounts, one browser (admin + student/teacher together)

**This is the one real gotcha in the whole system, and it's a cookie-scope
fact, not a bug you can "not do":** `access_token`/`refresh_token` are set
as **host-only cookies on `api.elhafazah-academy.com`**
(`core/cookies.py` — no `Domain=` attribute, `path="/"`). Both `Frontend`
(`elhafazah-academy.com`) and `Admin-CMS` (`admin.elhafazah-academy.com`)
call that *same* API host with `withCredentials: true`. Browsers store
cookies per (domain, path, name) — **not** per calling page/origin — so
there is only ever **one** `access_token` value for `api.elhafazah-academy.com`
in a given browser at a time, no matter which app's tab sent the request
that set it.

Concretely: if you're logged into Admin-CMS in one tab and then log into the
Frontend as a teacher in another tab (same browser), the Frontend's login
**silently overwrites** the cookie the Admin-CMS tab was relying on. The
Admin-CMS tab doesn't know anything changed — it just starts getting `403
"Admin access required"` on every subsequent request, because the browser is
now sending the teacher's token, not the admin's.

**What's actually in place for this:**
- `Admin-CMS/src/services/api/client.ts` detects a `403` whose message
  matches "access required" while it still believes it's authenticated,
  clears its local session, and forces a clean re-login with an explicit
  "Your session was replaced by another login in this browser" message —
  instead of spamming confusing generic error toasts. This fixes the
  *symptom* (confusing silent failure) but does not, and structurally
  cannot, stop the underlying cookie clobbering.
- Nothing analogous exists on the Frontend side yet (lower priority — an
  admin testing both apps at once is the only realistic case this hits;
  a real student/teacher has no reason to ever have Admin-CMS open).

**Practical takeaway:** if you need an admin session and a student/teacher
session alive at the same time, use two separate browser profiles (or one
normal + one Incognito/Private window) rather than two tabs in the same
browser profile. That isn't a workaround for a bug — it's the correct way
to hold two independent cookie jars against the same host.

## Security measures in the auth cycle

- **Passwords**: bcrypt, cost factor 12 (`core/security.py::hash_password`).
  Never logged, never returned in any response.
- **Cookies**: `HttpOnly` (unreadable by page JS — the main XSS mitigation),
  `Secure` in production (HTTPS only, `core/cookies.py::_is_secure_request`
  trusts `X-Forwarded-Proto` from Traefik), `SameSite=Lax`. This was a
  deliberate migration off `localStorage` — see `SYSTEM-STATUS.md`'s
  2026-08-04 entry; don't reintroduce token storage in JS-reachable state.
- **Refresh-token revocation fails closed** on a Redis outage (above) —
  availability is sacrificed for the guarantee that "revoked" actually means
  revoked.
- **Rate limiting** (`slowapi`, per-IP) on every auth-sensitive endpoint:
  `/auth/login` & `/auth/swagger-login` 10/min, `/auth/refresh` 30/min,
  `/auth/google/complete-registration` 10/min, `/auth/change-password` &
  `/auth/password-reset/request` 5/min, `/auth/password-reset/confirm` &
  `/auth/totp/verify` 10/min.
- **No user enumeration**: `POST /auth/password-reset/request` always
  returns `204`, whether or not the email exists or is a Google-only account
  (`service.py:193`). (Email delivery for the reset link itself is still
  pending SMTP configuration — see `pending-contact-us.md`; the token is
  logged, not emailed, until then.)
- **Google account-linking requires `email_verified`** before matching an
  existing account by email (above) — closes a silent account-takeover path,
  including against admin accounts.
- **Admin-only TOTP 2FA**: secret encrypted at rest with Fernet
  (`TOKEN_ENCRYPTION_KEY`, `core/crypto.py`), never stored/transmitted in
  plaintext after setup. Login for a 2FA-enabled admin is genuinely
  two-step — the `temp_token` from step one is a distinct, 5-minute-lived
  JWT type (`totp_pending`) that `verify_totp_login()` explicitly checks for,
  so it can't be replayed as a real access token even if intercepted.
- **Role checks are dependency-injected, not inline**: every admin/teacher/
  student-only route uses `AdminDep`/`TeacherDep`/`StudentDep`
  (`core/dependencies.py`), never an ad-hoc `if user.role == ...` scattered
  in a router — one place to get the check right.
- **CORS is an explicit allowlist** (`ALLOWED_ORIGINS`), not a wildcard —
  required specifically because cookie-based auth would otherwise be
  exploitable cross-origin from any site.
- **Production startup guard**: the app refuses to boot with `APP_ENV=production`
  if `SECRET_KEY`, `SESSION_SECRET`, or `ADMIN_PASSWORD` are still at their
  placeholder defaults (`config/settings.py`) — a misconfigured `.env.staging`
  fails loudly instead of silently signing tokens with a secret that's in
  this repo's history.
- **API docs disabled in production**: Swagger/ReDoc/raw OpenAPI schema
  (which would otherwise expose every route and auth scheme) only exist when
  `APP_ENV != production`.

## Known, accepted gaps (not bugs — just worth knowing)

- Logout doesn't blacklist the outstanding access token (above) — by design
  for stateless JWTs, bounded by the 30-minute access-token lifetime either way.
- Refresh tokens aren't rotated on each use — the same token/JTI is reused
  until its fixed 7-day expiry, rather than a sliding-window renewal.
- The cross-app cookie-sharing behavior (above) is mitigated in Admin-CMS
  but not architecturally fixed — genuinely fixing it would mean giving
  Admin-CMS its own distinct cookie names, which touches the login/OAuth
  cookie-setting code and the auth dependency chain on the backend. Flagged,
  not currently planned.

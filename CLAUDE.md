# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Hamilul-Quran is a Quran-teaching platform with three independently deployed apps in one repo, plus shared deployment infra:

- **`Back-end/`** — FastAPI (Python 3.12) REST API. Source of truth for auth, users, and all domain data.
- **`Frontend/`** — Next.js 16 (App Router, React 19) public site + student/teacher dashboards.
- **`Admin-CMS/`** — React 18 + Vite + TypeScript SPA for platform admins.
- **`docker-compose.yml` / `traefik/` / `db/`** — Production/staging stack: Traefik (TLS + routing), Postgres, Redis, the three app containers, and a `pg-backup` sidecar.

Routing: `elhafazah-academy.com` → Frontend, `admin.elhafazah-academy.com` → Admin-CMS, `api.elhafazah-academy.com` → Back-end.

For "what's currently broken / in progress / just shipped," check `SYSTEM-STATUS.md` (root) first — it's the maintained single source of truth for live deployment state, separate from `Back-end/PROGRESS.md` (backend feature backlog) and `test-summary.md` (test coverage notes). Check these before assuming a feature is finished; several Admin-CMS sections intentionally still run on mock data (see below).

## Commands

### Backend (`Back-end/`)
```bash
pip install -r requirements.txt

# Run the dev server (no .venv is checked in / pre-created — set one up or use system python)
uvicorn app.main:app --reload --port 8000

# Migrations
alembic upgrade head
alembic revision --autogenerate -m "description"   # after adding/changing a model

# Tests — needs a real Postgres reachable at DATABASE_URL with a "test" database
# (see tests/conftest.py; defaults to hamilul_quran_test, override with TEST_DATABASE_URL)
pytest
pytest tests/test_users.py                          # one file
pytest tests/test_users.py::test_create_user -v      # one test
pytest -k totp                                        # by keyword
```
Swagger UI at `/api/v1/docs`, ReDoc at `/api/v1/redoc` — both disabled when `APP_ENV=production`.

### Frontend (`Frontend/`)
```bash
npm run dev        # localhost:3000
npm run build
npm run lint
npm run test:e2e   # Playwright — spins up `yarn dev` itself, see playwright.config.ts
npx playwright test tests/auth.spec.ts   # one spec file
```

### Admin-CMS (`Admin-CMS/`)
```bash
yarn install
yarn dev            # Vite dev server, proxies /api/v1 to 127.0.0.1:8000
yarn build           # tsc -b && vite build
yarn lint            # eslint --max-warnings 0
yarn type-check
yarn test            # vitest run
yarn test:watch
```

### Full stack (staging/prod, via Docker Compose)
See `DEPLOYMENT.md` for the full runbook (build/restart order, backups, rollback, auth smoke test). Short version:
```bash
docker compose --env-file .env.staging build backend frontend admin
docker compose --env-file .env.staging up -d backend frontend admin
docker ps --format "table {{.Names}}\t{{.Status}}"
```
Migrations run automatically on backend container startup (`Back-end/entrypoint.sh` → `alembic upgrade head` before Uvicorn starts).

## Backend architecture

**Feature-module layout** — `app/features/<name>/` (auth, users, teachers, students via users' sub-resources, allocations, complaints, dashboard, admins, sessions, requests, calendar, subscriptions, receipts). Each feature owns its own `models.py`, `schemas.py`, `service.py`, `router.py`. Routers are wired up explicitly in `app/main.py::_register_routers` — there's no auto-discovery, so a new feature router must be added there by hand.

**Model registration** — every SQLModel table must additionally be imported in `app/database/base.py`. Alembic (`env.py`) and the test suite's `SQLModel.metadata.create_all()` both rely on this file to know about a table; a model that's never imported there silently won't get migrated or created in tests.

**Auth** — JWT access/refresh tokens (`app/core/security.py`), issued as HttpOnly cookies (`access_token`/`refresh_token`, see `app/core/cookies.py`) for browser clients. `app/core/dependencies.py::get_current_user` accepts either the cookie or an `Authorization: Bearer` header (the header path exists for Swagger UI / non-browser clients via `oauth2_scheme(auto_error=False)`), so don't assume one or the other when touching auth-adjacent code. Role guards (`AdminDep`, `TeacherDep`, `StudentDep`) are dependency-injected via `require_admin`/`require_teacher`/`require_student` in the same file — prefer these over inline role checks in routers. Admins additionally support TOTP 2FA (`app/features/auth/totp.py`); login returns a `temp_token` requiring `/auth/totp/verify` instead of full tokens when 2FA is enabled.

**Settings** (`app/config/settings.py`) — Pydantic `BaseSettings` loaded from `.env`/env vars. A model validator refuses to start the app in `APP_ENV=production` if `SECRET_KEY`, `SESSION_SECRET`, or `ADMIN_PASSWORD` are still at their placeholder defaults — don't relax this check. `app/core/config.py` is a deprecated re-export shim kept only for import back-compat; import from `app.config.settings` in new code.

**Testing** (`tests/conftest.py`) — the full FastAPI app is exercised end-to-end via `httpx.AsyncClient` + `ASGITransport` (real routing/middleware/DI), with only the DB session and Redis client dependency-overridden. Each test runs inside an outer DB transaction rolled back at teardown (app-level `commit()` calls become SAVEPOINTs via `join_transaction_mode="create_savepoint"`), and Redis is `fakeredis` — no external services needed beyond a real Postgres test database. Fixtures `admin_user`/`teacher_user`/`student_user` (+ matching `*_headers`) and the `make_user` factory cover most auth setup; use `auth_headers_for(user)` for ad-hoc cases.

**Uploads** (`app/core/storage.py`) — teacher certificates and student payment receipts are stored on a local filesystem path (`UPLOAD_DIR`, a Docker named volume in prod), size- and magic-byte-checked before persisting.

## Frontend architecture (Next.js)

- App Router under `app/`, split into `app/dashboard/student/*` and `app/dashboard/teacher/*` role-specific trees, each with its own shell client component (`StudentShellClient.tsx` / `TeacherShellClient.tsx`) and `layout.tsx`.
- `lib/api.ts` wraps Axios with `withCredentials: true` (cookie auth, matching the backend) and a response interceptor that attempts one silent `/auth/refresh` on a 401 before redirecting to `/login`.
- `lib/dashboard/` holds cross-cutting dashboard context/providers: `UserContext`, `StudentStatusContext`, `i18n`, `theme`, `calendarUtils`.
- `proxy.ts` at the repo root is an edge middleware intended to gate `/dashboard/*` by cookie presence — check `next.config.ts`/actual middleware wiring before relying on it; per `SYSTEM-STATUS.md` this has previously been dead code (wrong filename/export for Next.js to load), with real route protection enforced only by the backend + client-side checks.
- UI primitives live in `components/ui/` (shadcn-style: button, card, input, table, badge, label); feature UI in `components/dashboard/`.

## Admin-CMS architecture (Vite SPA)

- Feature-first layout under `src/features/<name>/` (users, complaints, allocations, subscriptions, plans, receipts, requests, calendar, dashboard, admins, auth), each typically with `components/`, `pages/`, `schemas/` (Zod), `store/` (Zustand slice), `types/`.
- `src/services/api/client.ts` — shared Axios instance, cookie-based (`withCredentials: true`, matches backend HttpOnly cookies), with global 401 → redirect-to-login and toast-on-error interceptors. Prefer the typed `get/post/put/patch/del` helpers over calling `apiClient` directly in feature code.
- **Hybrid integration state**: only `auth` and `users` (students/teachers + their nested complaints/teacher-history/session-scores) are wired to the live backend. `dashboard`, `complaints` (the general board), `plans`, `subscriptions`, `admins`, `allocations`, and `requests` currently render from `src/mock-data/` — check `Admin-CMS/README.md`'s integration table and `SYSTEM-STATUS.md` before assuming a section is backend-connected.
- State/data: Zustand for client/UI state, `@tanstack/react-query` for server state, `react-hook-form` + Zod for forms, `@tanstack/react-table`/`react-virtual` for tables, `recharts` for charts, `@tiptap/react` for rich text.
- i18n via `i18next`/`react-i18next`, locale files under `src/i18n/locales/`.

## Cross-cutting notes

- Both `Frontend` and `Admin-CMS` authenticate against the same backend via HttpOnly `access_token`/`refresh_token` cookies (not `localStorage` / `Authorization` headers) — this was a deliberate security fix (see `SYSTEM-STATUS.md`), so don't reintroduce token storage in JS-reachable state.
- CORS (`app/middleware/cors.py`) is origin-allowlisted via `ALLOWED_ORIGINS` — cookie-based auth requires the exact frontend/admin origins to be listed, not a wildcard.
- Rate limiting on auth endpoints (`slowapi`, `app/core/rate_limit.py`) — `/auth/login`, `/auth/swagger-login`, `/auth/refresh`, `/auth/google/complete-registration` are throttled per-IP; keep this in mind if writing tests or scripts that hit these repeatedly.
- Each subproject has its own `Dockerfile`; all three run as non-root users in their containers (see comments in `Back-end/Dockerfile` for the `gosu`-based uid-drop pattern used there).

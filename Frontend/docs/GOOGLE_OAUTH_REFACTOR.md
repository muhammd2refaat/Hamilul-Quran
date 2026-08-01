# Google OAuth Auth Refactor — Frontend

Date: 2026-07-03

## Why

The signup/login wizard on the landing page (`app/page.tsx`) was a static
mock — the "Continue/Sign up with Google" buttons didn't call anything, and
"Create account" just closed the modal. This wires it up to the real backend
Google OAuth flow (see `Back-end/docs/GOOGLE_OAUTH_REFACTOR.md` for the
server side).

## What changed

### `app/page.tsx`
- Added `startGoogle(intent, role?)`, which redirects the browser to
  `${NEXT_PUBLIC_API_URL}/auth/google/login?intent=...&role=...`. The backend
  owns the OAuth redirect/callback (authorization-code flow), not the frontend.
- The login modal's "Continue with Google" button and the register wizard's
  Step 2 "Sign up with Google" button now call `startGoogle` instead of just
  advancing/closing the modal.
- **Note:** the wizard's Step 3 (student/teacher detail fields) is still in
  this file as UI reference, but is no longer the form that actually submits
  registration — see `app/register/complete/page.tsx` below. This is because
  the backend flow requires Google consent to happen *before* profile
  completion (Google returns an authorization code to the backend, not the
  browser).

### New: `app/auth/callback/page.tsx`
Landing page for the backend's redirect after an **existing user** logs in
with Google. Reads `access_token` / `refresh_token` / `role` from the URL
*fragment* (never sent to any server, never logged), stores them, then routes
to `/dashboard/teacher` or `/dashboard/student`.

### New: `app/register/complete/page.tsx`
Landing page for the backend's redirect after a **new user** signs up with
Google. Reads `registration_token` + `role` from the query string, renders the
role-specific fields (student: country/phone/age/gender; teacher:
worked-online-before/juz memorized/**ijaza multi-select**/certificate upload),
and submits them as `multipart/form-data` to
`POST /auth/google/complete-registration`. On success, stores the returned
tokens and routes to the dashboard.

The teacher qualification field changed from a **single select** to a
**multi-select checkbox list** (`IJAZA_OPTIONS`), since a teacher can hold more
than one ijaza — the backend now stores this as multiple `ijazas` rows.

### New: `lib/auth.ts`
Centralizes token storage (`storeTokens`, `getRefreshToken`, `clearTokens`) so
the same logic is shared between password login, Google login, and Google
registration instead of being duplicated inline.

### `lib/api.ts`
The axios response interceptor now attempts a one-shot silent refresh via
`POST /auth/refresh` on a 401 before falling back to clearing tokens and
redirecting to `/login`. Previously the returned `refresh_token` was stored
but never actually used.

### `app/login/page.tsx`
Now calls `storeTokens()` from `lib/auth.ts` instead of writing to
`localStorage`/cookies inline.

### `app/layout.tsx`
Added `suppressHydrationWarning` to `<body>`. This fixes a hydration-mismatch
console error caused by the Grammarly browser extension injecting
`data-gr-ext-installed` / `data-new-gr-c-s-check-loaded` attributes onto
`<body>` before React hydrates — it is not a bug in app code, just a
client-only DOM mutation from an extension that React can't predict during SSR.

## Required setup to test the full flow

1. Backend must have real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` set in
   `Back-end/.env` (see backend docs) and be restarted after editing `.env`.
2. `NEXT_PUBLIC_API_URL` should point at the running backend, e.g.
   `http://localhost:8000/api/v1` (default if unset).
3. Redis must be running on the backend for the signup handoff to work.

## Known follow-ups / out of scope here
- No Google Calendar UI yet (e.g. showing connected/disconnected status) —
  the consent is requested during signup but there's nothing in the UI that
  surfaces it yet.
- `app/page.tsx`'s in-modal Step 3 fields are now dead UI for the registration
  path (Google always redirects away from the modal). Consider removing them
  or repurposing that step as a "what we'll ask you next" preview.

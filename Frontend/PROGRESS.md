# Frontend Progress Tracker

Living reference for auth/account work on the Hamilul-Quran frontend. Update
this as work lands or plans change — newest entries at the top of each section.

## Done

- **2026-07-03** — Rebuilt `app/login/page.tsx`: added a "Continue with
  Google" button (previously only the landing-page modal had one — `/login`
  had none, which meant the backend's login-rejection redirect landed users
  on a page with no way to see why or what to do). Now reads
  `?error=not_registered&email=...` from the backend and shows "You haven't
  signed up with this Google account yet" plus one-click "Sign up as
  Student"/"Sign up as Teacher" shortcuts.
- **2026-07-03** — Wired the landing-page auth modal's Google buttons to the
  real backend OAuth flow (`app/page.tsx`); added `app/auth/callback/page.tsx`
  (existing-user login landing) and `app/register/complete/page.tsx`
  (new-user profile completion: student fields or teacher fields with a
  multi-select ijaza list + certificate upload). Details:
  `docs/GOOGLE_OAUTH_REFACTOR.md`.
- **2026-07-03** — Added `lib/auth.ts` to centralize token storage; wired a
  silent refresh-token retry into the `lib/api.ts` axios interceptor
  (previously the refresh token was returned by the API but never used).
- **2026-07-03** — Fixed a hydration-mismatch console error in
  `app/layout.tsx` (`suppressHydrationWarning` on `<body>`) caused by the
  Grammarly browser extension injecting attributes before hydration.
- (pre-existing) Email/password login (`app/login/page.tsx`), student/teacher
  dashboards, allocations/session-score/teacher-history API calls.

## Next up / not started

- [ ] Remove or repurpose the now-dead Step 3 fields inside the landing
  page's register modal (`app/page.tsx`) — Google signup always redirects
  away from the modal to `/register/complete`, so that inline step no longer
  submits anything.
- [ ] Surface Google Calendar connection status somewhere in the teacher/
  student dashboard once the backend supports reading it back.
- [ ] Loading/error states polish on `app/register/complete/page.tsx` (e.g.
  what happens if the `registration_token` expires mid-fill — currently just
  shows the backend's error message).
- [ ] Decide on a "forgot password" or "set a password" flow for
  Google-only accounts if the backend adds that later.

## Notes for future me

- `app/login/page.tsx` wraps its body in `<Suspense>` because it calls
  `useSearchParams()` — required by Next.js App Router or the build can bail
  a static-rendered segment to client-only with a warning. Keep that wrapper
  if you touch this file.
- Tokens from Google OAuth arrive via the URL **fragment**
  (`#access_token=...`), not query string, on `/auth/callback` — don't switch
  that to a query param without checking the backend redirect in
  `app/features/auth/google_service.py` (`_frontend_success`), since fragments
  are the point (never sent to any server / never logged).
- `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000/api/v1` in both
  `lib/api.ts` and the new OAuth redirect helpers — keep them consistent if
  you add more direct-fetch (non-axios) calls.

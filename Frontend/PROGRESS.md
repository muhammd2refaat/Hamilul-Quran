# Frontend Progress Tracker

Living reference for auth/account work on the Hamilul-Quran frontend. Update
this as work lands or plans change — newest entries at the top of each section.

## Done

- **2026-07-13** — Real subscription data on `/dashboard/student/plan` and a
  new `/dashboard/student/receipts` page, backed by the new
  `subscriptions`/`receipts` backend features (see `Back-end/PROGRESS.md`,
  "Admin controls" entry).
  - **Plan page**: replaces the "coming soon" placeholder with real data
    from `GET /subscriptions/me` — plan name, status badge
    (active/paused/withdrawn, new `planStatusWithdrawn` string), start
    date, notes. Falls back to the previous "pending admin activation"
    placeholder when the student has no subscription row yet (404). The
    existing "request plan change" → `POST /requests` flow is untouched.
    New `Subscription`/`Receipt` types in `types/dashboard.ts`.
  - **Receipts page** (new, `app/dashboard/student/receipts/page.tsx`):
    upload a payment-screenshot image (amount/note optional) via
    multipart `POST /receipts`, list the student's own uploads
    (`GET /receipts/me`) with upload/expiry dates. Added to the student
    nav (`StudentShellClient.tsx`, both the "new student" and "active
    student" nav arrays) with a new `Receipt` icon and `navReceipts`
    string. All strings added to `lib/dashboard/i18n.tsx` DICT for both
    `en`/`ar`.
  - Verified: `npx tsc --noEmit` and `yarn build` both pass clean; the new
    `/dashboard/student/receipts` route appears in the production build
    output.
- **2026-07-13** — Added a "Calendar" nav item to both
  `app/dashboard/{teacher,student}/calendar/page.tsx`, additive alongside
  the existing `/schedule` and `/webinar` pages. Fetches
  `GET /calendar/me?weeks=4` (real backend Google Calendar integration,
  see `Back-end/PROGRESS.md`) and renders an agenda list grouped by real
  date — with a genuine clickable Google Meet "Join" link once one exists
  for that recurring slot (falls back to the same disabled-button styling
  as `/schedule`/`/webinar` otherwise). New shared helpers:
  `lib/dashboard/calendarUtils.ts` (date grouping/formatting, no date
  library needed) and a `CalendarEvent` type in `types/dashboard.ts`.
- **2026-07-13** — Redesigned the student and teacher dashboards
  (`app/dashboard/{student,teacher}/…`) in the "Emerald Editorial" design
  system (same palette/fonts/motifs as the landing page), replacing the bare
  shadcn/slate scaffolds. Bilingual EN/AR + RTL, reusing the landing page's
  `elhafazah_lang` localStorage key (`lib/dashboard/i18n.tsx`). Shared
  building blocks added under `lib/dashboard/` (theme, i18n, user/status
  contexts) and `components/dashboard/` (DashboardShell, StatCard,
  SectionHeader, ArchPanel, Placeholder, RequestModal, EmptyState) — reuse
  these for any further dashboard pages rather than duplicating styles.
  - **Teacher**: overview, weekly `/schedule` (built from allocation
    `schedule[]`), `/students` roster, and a student detail page with a
    **record-session form** (score, max_score, surah, recitation_type,
    teacher_comment, notes) that posts to `POST /session-scores` — the
    "comment + score per session" feature. Backed by two new endpoints,
    `GET /teachers/me/students` and
    `GET /teachers/me/students/{id}/session-scores`
    (`Back-end/app/features/teachers/{router,schemas,service}.py`; no
    migration — joins existing tables). Verified directly against the
    service layer (roster shape, cross-teacher 404 guard, record→refetch
    round trip) since both dev teacher accounts are currently `SUSPENDED`
    and couldn't be driven through a real login for an HTTP-level check.
  - **Student**: "New" vs "Current" state is derived from whether
    `GET /allocations/me` is empty (no new backend field) — New shows a
    free-trial request CTA, Current shows the full nav. Views: `/progress`
    (session scores + teacher history — fixed a pre-existing type bug where
    the frontend read `TeacherHistory.ended_at`, which the backend has never
    returned; the real field is `unassigned_at`), `/plan`, `/webinar`,
    `/teacher-change`, `/about`, `/contact`. All verified live against the
    API with a real (ACTIVE) student account: `/users/me`, `/allocations/me`,
    `/users/me/session-scores`, `/users/me/teacher-history`, `/requests/me`,
    and a full `POST /requests` → `GET /requests/me` round trip (test rows
    cleaned up after).
  - **Explicit placeholders (no backend yet)**: plan/subscription data,
    active/pause status, and the webinar "Join session" Google Meet link all
    render as clearly-labeled "coming soon" cards
    (`components/dashboard/Placeholder.tsx`) rather than fake data. The
    backend already stores a Google refresh token with Calendar scope
    (`google_credentials`), so a future endpoint could mint a real Meet link
    per scheduled session — not built in this pass.
- **2026-07-03** — Added `app/privacy/page.tsx` and `app/terms/page.tsx`
  (draft Privacy Policy / Terms of Service) plus footer links to them from
  the landing page — required by Google before it will verify/publish the
  OAuth consent screen for public sign-in. **Both pages have a
  `[SUPPORT_EMAIL]` placeholder that must be replaced before going live**,
  and should get a legal review — see
  `Back-end/docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md`.
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

## In progress / needs user action

- [ ] **Deploy to a real HTTPS domain.** Google's OAuth verification requires
  the app homepage and privacy/terms links to be publicly reachable —
  `localhost` won't be accepted. This blocks Google verification entirely
  until done. See `Back-end/docs/GOOGLE_OAUTH_VERIFICATION_CHECKLIST.md`.
- [x] **2026-08-04** — Replaced `[SUPPORT_EMAIL]` in `app/privacy/page.tsx`
  and `app/terms/page.tsx` with `elhafazahacademy111@gmail.com`. Still needs
  the legal-counsel review noted in the TODO comments in both files — this
  only fixed the live placeholder that real visitors were seeing.
- [ ] Both dev teacher accounts (`teacher@example.com`,
  `mr3118430@gmail.com`) are currently `status=SUSPENDED` in the DB — the
  new teacher dashboard (`/dashboard/teacher/...`) couldn't be driven
  through a real browser login for that reason. Activate one to do a full
  click-through check; the backend logic itself is verified (see the
  2026-07-13 entry above).

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
- [ ] Build a Plans/Subscriptions backend (model + admin active/pause
  toggle) — `/dashboard/student/plan` currently shows a labeled placeholder
  card (`components/dashboard/Placeholder.tsx`) since there's no plan data
  to read yet; "change plan" already submits a real `POST /requests`
  (`type: other`) for an admin to action manually in the meantime.
- [ ] Wire a real Google Meet link into `/dashboard/{student,teacher}/…`
  session/schedule views once a backend endpoint exists to mint one from the
  stored Calendar refresh token — see the Calendar-status item above.

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

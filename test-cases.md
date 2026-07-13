# Manual Test Case Checklist — Hamilul-Quran

Covers the real feature set across all three apps: **Back-end** (FastAPI),
**Admin-CMS** (Vite/React admin panel), **Frontend** (Next.js student/teacher
portal). Pair this with the automated suites (see `test-summary.md`) —
this checklist is for exploratory/manual passes, especially anything that
needs a real browser or a real Google account.

Legend: `[ ]` not yet run · `[x]` passing · `[!]` known gap (see
`test-summary.md` for detail, don't re-report these).

## Auth

- [ ] Login with correct email/password → redirected to the right
      dashboard (student vs teacher); Admin-CMS additionally rejects
      non-ADMIN roles with "This account does not have admin access."
- [ ] Login with wrong password / unknown email → clear error, stays on
      the login page.
- [ ] Login with a `SUSPENDED` account → rejected.
- [ ] Logout, then reuse the old refresh token → must be rejected (401).
      *(This was broken until this pass — see test-summary.md.)*
- [ ] Access token expires → next request 401s → app either silently
      refreshes (Frontend/Admin-CMS interceptor) or bounces to login.
- [!] "Forgot password?" on the Admin-CMS login screen — currently a
      dead end (`POST /auth/request-password-reset` doesn't exist on the
      backend). Don't file this again; it's a known gap.
- [ ] Google sign-in (real browser, real Google account) — login intent,
      signup intent (student + teacher), `not_registered` rejection,
      `account_inactive` / `google_identity_unavailable` error redirects.
      *(Needs a real Google account — can't be scripted.)*

## Users (Admin-CMS)

- [ ] List, search, filter by role/status/country.
- [ ] Create a user (student/teacher), duplicate email rejected (409),
      short password rejected (422).
- [ ] Edit a user's fields.
- [ ] Suspend a user (status → SUSPENDED) — they can no longer log in.
- [ ] **Hard-delete a user** — confirm the warning copy says "permanently
      delete ... cannot be undone", not "deactivate". After deleting:
      - the user's row is gone (re-fetch 404s)
      - their email is free to reuse
      - their allocations, complaints, requests, subscription, receipts
        (+ receipt files on disk), teacher profile/ijazas/reviews are all
        gone
      - any other student who had this user as their teacher now shows
        "Not assigned"

## Allocations (Admin-CMS)

- [ ] Create an allocation (pick teacher + student, sessions/week,
      duration, weekly schedule) — 3-step modal.
- [ ] Edit an existing allocation (Edit button reopens the modal
      prefilled) — change duration/schedule, save.
- [ ] Delete an allocation (confirm dialog) — it disappears from the grid.
- [ ] If the teacher has a connected Google Calendar: editing the
      schedule regenerates the Meet event; deleting removes it.
      *(Needs a real connected Google account — can't be scripted.)*

## Complaints (Admin-CMS)

- [ ] List complaints, filter by source (student/teacher) and status.
- [ ] Mark In Review → Resolve / Dismiss — status + admin note update,
      `resolved_at` gets stamped on resolve/dismiss.
- [!] There's no way for a student/teacher to *file* a complaint yet
      (no `POST /complaints` — known backlog item, not this pass's scope).

## Requests (Admin-CMS + Frontend)

- [ ] Frontend: submit a request from Contact Us, or "Change Teacher",
      or "Request plan change" on the Plan page — confirm success message.
- [ ] Admin-CMS: new request appears in the list with correct type badge
      and requester name.
- [ ] Approve / mark In Review / Reject a request — status + admin note
      update; student can see the updated status if they check back
      (via `/requests/me`, not currently surfaced in Frontend UI beyond
      the initial "sent" confirmation).

## Subscriptions (Admin-CMS + Frontend)

- [ ] Admin-CMS: "Change subscription" on a student with no plan yet —
      shows "No subscription" until set.
- [ ] Set plan name / status (active/paused/withdrawn) / start date /
      notes — saves, list refreshes with the new values.
- [ ] Change the same student's subscription again — updates in place
      (not a duplicate row).
- [ ] Frontend: student's Plan page reflects the real plan name, status
      badge, and start date after admin sets it; shows the "pending"
      placeholder before any subscription exists.

## Receipts (Admin-CMS + Frontend)

- [ ] Frontend (student): upload a payment screenshot (PNG/JPEG only),
      optional amount/note — success message, appears in "my receipts"
      with upload + expiry dates.
- [ ] Admin-CMS: receipt appears in the admin list with the student's
      name; clicking **View** shows the actual image (this goes through
      an authenticated blob fetch — if this silently fails, check the
      browser console for a CORS or CSP error, not just "file not found").
- [ ] A receipt older than 30 days no longer appears in either list and
      its file is gone from disk (lazy-purge — happens on the next list
      call, no manual trigger needed).
- [ ] A student cannot view another student's receipt file directly by
      guessing the URL (403).

## Admins (Admin-CMS, Super Admin only)

- [ ] List/create/edit admins. New admin is forced to ADMIN role even if
      a different role is submitted.
- [ ] Editing an existing admin cannot demote them via this screen (role
      change is silently ignored, other fields still save).
- [ ] Delete an admin — permanently removed (same hard-delete as Users).
- [ ] A non-Super-Admin never sees the "Admins" nav item at all.

## Teachers (Frontend teacher portal + Admin-CMS)

- [ ] Teacher's own profile view/edit (juz memorized, worked online
      before, ijazas) — self only; another user gets 403.
- [ ] Admin can view/edit any teacher's profile.
- [ ] Leave a review for a teacher (student or admin) — admin reviews
      are flagged distinctly from student reviews.
- [ ] Teacher's "My Students" roster shows every student they're
      allocated to, with last session score if one exists.
- [ ] Teacher records a session score for a student (score, max score,
      surah, recitation type, comment, notes) — appears in that
      student's history immediately.
- [ ] A student cannot record a session score (403); an admin can, but
      must supply `teacher_id` explicitly.

## Calendar (Frontend + Admin-CMS)

- [ ] Student/teacher's Calendar page shows upcoming sessions projected
      from their allocation schedule, correct day/time.
- [ ] Admin's Calendar (admin-only) shows every teacher's and student's
      upcoming sessions.
- [ ] If the teacher has a connected Google Calendar, a real "Join"
      Meet link appears; otherwise the join button is disabled/absent.
      *(Needs a real connected Google account for the positive case.)*

## Dashboard (Admin-CMS)

- [ ] Metrics load: total users/students/teachers/admins, users by
      status, complaints by status, total allocations, total countries,
      signups by month, recent signups.
- [ ] Creating a new allocation/user is reflected in the next metrics
      fetch (no caching lag).

## Cross-cutting

- [ ] **i18n**: toggle English ⇄ Arabic in Admin-CMS — layout flips RTL,
      all named feature pages (dashboard, users, students, teachers,
      complaints, requests, allocations, admins, subscriptions,
      receipts) show translated strings, not raw i18n keys.
- [ ] **Ports**: Backend (8000), Frontend (3000), Admin-CMS (5173) all
      run simultaneously without conflict; Admin-CMS's API calls
      succeed (check browser devtools Network tab — a CSP block shows
      as a red network-level failure with a console CSP warning, not a
      normal 4xx/5xx response).
- [ ] Every role-guarded endpoint correctly 403s for the wrong role and
      401s for no/garbage token (spot-check a few from each feature
      area — the full matrix is covered by the pytest suite).

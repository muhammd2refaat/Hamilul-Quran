# Google OAuth Verification Checklist

Date started: 2026-07-03

## Why this exists

Google apps in "Testing" publishing status only allow sign-in from a manual
allowlist of test users (max 100). Anyone else gets a hard
`Error 403: access_denied — has not completed the Google verification
process` page **from Google itself**, before our app ever sees the request.
There is no way to intercept or customize this screen from our code — it has
to be fixed by publishing/verifying the OAuth app in Google Cloud Console.

This is a live checklist — check items off as you complete them in
[Google Cloud Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent).

## ⚠️ First: confirm you're in the right project

The consent screen currently shows the app name **"N8N-Calander"**. That
suggests the OAuth client in use may live in (or was copied from) a Google
Cloud project originally set up for an unrelated n8n automation workflow —
not a project created for Hamilul-Quran. Before doing anything else:

- [ ] Confirm which Google Cloud project the current `GOOGLE_CLIENT_ID` in
  `.env` belongs to.
- [ ] Decide: rename/rebrand this project, or create a fresh project
  dedicated to Hamilul-Quran and re-issue credentials. A fresh project is
  usually cleaner if this one has unrelated history/other OAuth clients on it.

## Branding (OAuth consent screen → Branding)

- [ ] **App name** → change to `Hamilul-Quran` (or `Elhafazah Academy`,
  matching the frontend's branding — pick one and use it consistently).
- [ ] **App logo** → upload a square logo (Google reviews this; use the same
  mark as the site header, the "ح" emblem).
- [ ] **User support email** → a real, monitored inbox.
- [ ] **App domain — Application home page** → your production frontend URL
  (e.g. `https://your-domain.com`). **Cannot be `localhost`** — you need the
  frontend deployed to a real domain before you can submit for verification.
- [ ] **Application privacy policy link** → `https://your-domain.com/privacy`
  (page already built: `Frontend/app/privacy/page.tsx` — replace the
  `[SUPPORT_EMAIL]` placeholder in that file first).
- [ ] **Application Terms of Service link** → `https://your-domain.com/terms`
  (page already built: `Frontend/app/terms/page.tsx` — same placeholder to fix).
- [ ] **Authorized domains** → add your production domain. Google may require
  you to verify ownership of it via
  [Search Console](https://search.google.com/search-console) first.
- [ ] **Developer contact information** → email(s) Google will use during review.

## Redirect URI / client config (Credentials → your OAuth client)

- [ ] Add the **production** callback URL as an authorized redirect URI,
  e.g. `https://api.your-domain.com/api/v1/auth/google/callback` (alongside
  the existing localhost one, which you can keep for dev).
- [ ] Update `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` in the production
  environment's `.env` to match the real domains.

## Scopes & justification

Requested scopes: `openid`, `email`, `profile` (standard, no justification
needed), and `https://www.googleapis.com/auth/calendar.events` — a
**sensitive scope**, which requires written justification during submission.

Suggested justification text (edit to taste, paste into the review form):

> Hamilul-Quran is an online Quran education platform connecting students
> with teachers for live lessons. We request the calendar.events scope to
> create, update, and check availability for scheduled lesson sessions
> directly on the user's Google Calendar, so students and teachers don't miss
> lessons and don't need to manually add them. We do not access or store any
> calendar content unrelated to scheduling lessons on our platform.

- [ ] Prepare a short screen-recorded demo (Google sometimes requests this for
  sensitive scopes, even if not always mandatory) showing:
  1. A user clicking "Sign in with Google" and reaching the consent screen.
  2. Granting the Calendar permission.
  3. The app using it to schedule/display a lesson (once that feature exists
     — see `Back-end/PROGRESS.md`, Calendar event creation is not implemented
     yet, only the credentials are captured. You may need to build a minimal
     version of that feature before verification can be approved, since
     reviewers check that a requested scope is actually used.)

## Submission

- [ ] Publishing status: **Testing → In production** (this triggers the
  verification review for sensitive scopes).
- [ ] Expect the review to take anywhere from a few days to a few weeks.
- [ ] You can keep adding test users in parallel so development isn't
  blocked while verification is pending.

## Once verification is approved

- [ ] Remove/replace the `[SUPPORT_EMAIL]` and `[COMPANY_ADDRESS]` placeholders
  in `Frontend/app/privacy/page.tsx` and `Frontend/app/terms/page.tsx` with
  real values if not already done.
- [ ] Re-test full signup with a Google account that was **never** added as a
  test user, to confirm public access actually works.

## Not legal advice

The privacy policy and terms of service pages built alongside this checklist
(`Frontend/app/privacy`, `Frontend/app/terms`) are drafts written to unblock
Google's verification requirement — they are not a substitute for review by
a lawyer, especially given this platform collects data from minors and may
have GDPR/COPPA-type obligations depending on where users are located.

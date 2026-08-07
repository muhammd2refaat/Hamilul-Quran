# Pending — Contact Us / request-email notifications

**Last updated:** 2026-08-07
**Related commits:** `2b60a3b` (teacher Contact Us page + mailer), `04919d3`
(fixed the enum bug that was silently breaking every `/requests` submission).

This tracks what's left to fully close out "student/teacher Contact Us
message should reach Admin-CMS and email the admin."

---

## Done

- Student **and** teacher dashboards both have a Contact Us page
  (`/dashboard/student/contact`, `/dashboard/teacher/contact`). Both POST to
  `POST /requests` with `type: "other"`.
- Admin-CMS's Requests page (`src/features/requests/`) already reads live
  from `GET /requests` / `PATCH /requests/{id}/status` — this was already
  wired to the backend, it just couldn't save anything until the requests
  table's enum-type bug was fixed (`04919d3`). Contact messages (and every
  other request type) now show up there correctly.
- Backend mailer added (`Back-end/app/core/email.py`, stdlib `smtplib`, no
  new dependency) and wired into `RequestService.create()` — every new
  request (contact message, **free trial** / `new_enrollment`, change-teacher,
  plan change, reschedule) emails a summary. Best-effort: never raises, so a
  mail outage/misconfiguration can't break request submission.
- **Destination confirmed (2026-08-07):** requests/Contact Us notifications
  now go to `elhafazahacademy111@gmail.com`, via a new dedicated
  `CONTACT_NOTIFICATION_EMAIL` setting — kept separate from `ADMIN_EMAIL`
  (that one is only the admin *login* seed account used by `full_seed.py`,
  not necessarily the same inbox). Set in `.env.staging`; falls back to
  `ADMIN_EMAIL` if ever left blank.

## Pending — needs input from the site owner

**SMTP is still not configured — the destination is set, but nothing can
send yet.** `SMTP_HOST` is unset in `.env.staging`, so `send_email()`
currently no-ops (logs `"Email not sent (SMTP not configured)"` and
returns) — messages still land in Admin-CMS correctly, they just don't
trigger an email yet.

To turn emailing on, need from the site owner:
- SMTP host + port (whatever mailbox/relay actually sends the mail — could
  be Gmail SMTP on `elhafazahacademy111@gmail.com` itself, Google Workspace
  on `elhafazah-academy.com`, or a transactional service like
  SendGrid/Mailgun)
- Username + password (or app password) to authenticate with that host —
  if using Gmail/Workspace SMTP directly, this must be a 16-character
  **App Password** (Google Account → Security → 2-Step Verification → App
  passwords), not the account's normal login password; Gmail rejects plain
  password SMTP auth
- Which address to send *as* (defaults to the SMTP username if
  `SMTP_FROM_EMAIL` is left unset)

Once provided: set `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` /
`SMTP_PASSWORD` / `SMTP_FROM_EMAIL` in `.env.staging`, redeploy `backend`,
then verify with a real Contact Us submission.

## Known limitation (not yet scoped/built)

- The notification email is one-directional (admin gets alerted only).
  There's no reply-to-user flow — an admin still has to open Admin-CMS and
  use the existing status/admin-note update (`PATCH /requests/{id}/status`)
  to respond; there's no "reply by email" thread. Flag if that's wanted.

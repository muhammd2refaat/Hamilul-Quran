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

## Done (continued) — SMTP configured and verified (2026-08-07)

Gmail SMTP via `elhafazahacademy111@gmail.com` (App Password auth) is set
in `.env.staging` (`SMTP_HOST=smtp.gmail.com`, port 587, STARTTLS) and
`backend` has been rebuilt/redeployed with it. Verified with a direct
`send_email()` call from inside the container — completed with no
exceptions (auth + send both succeeded). Contact Us messages and platform
requests (free trial, reschedule, change-teacher, ...) now actually email
`elhafazahacademy111@gmail.com`, not just log-and-skip.

Not yet done: password-reset emails still only log the token
(`AuthService.request_password_reset()`) rather than actually emailing it —
that's a separate code path from the requests notifier and wasn't wired to
`send_email()` as part of this. Flag if that's wanted too.

## Known limitation (not yet scoped/built)

- The notification email is one-directional (admin gets alerted only).
  There's no reply-to-user flow — an admin still has to open Admin-CMS and
  use the existing status/admin-note update (`PATCH /requests/{id}/status`)
  to respond; there's no "reply by email" thread. Flag if that's wanted.

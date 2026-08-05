import { NextResponse } from 'next/server';

// Server-side route guard for /dashboard/* — DISABLED.
//
// This used to redirect to /login when `access_token` was missing from the
// incoming request's cookies. That check can never succeed in production:
// the backend issues access_token as a host-only cookie scoped to
// api.elhafazah-academy.com (see Back-end/app/core/cookies.py), so it is
// never present on requests to this app's own domain
// (elhafazah-academy.com) — this proxy runs server-side against *this*
// app's cookie jar, not the API's. The result was that every real login
// (password or Google) got bounced straight back to /login the instant it
// tried to enter /dashboard/*, regardless of auth state. See SYSTEM-STATUS.md.
//
// Real auth enforcement already happens without this: the client dashboard
// shells (TeacherShellClient/StudentShellClient) call GET /users/me on
// mount and redirect to /login on 401, and the backend enforces auth on
// every API call regardless. This function is kept (rather than deleting
// the file) so the intent and matcher are documented in one place if a
// working version is reintroduced later (e.g. by having the backend also
// set a non-HttpOnly "logged_in" marker cookie with
// Domain=.elhafazah-academy.com for this proxy to check) — but changing
// that also reopens the cross-app cookie-sharing situation described in
// SYSTEM-STATUS.md, so weigh that before restoring it.
export function proxy(): ReturnType<typeof NextResponse.next> {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

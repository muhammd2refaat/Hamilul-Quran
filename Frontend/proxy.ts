import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Two unrelated jobs live here because Next.js only allows one middleware
// entry point per app:
//
// 1. Dashboard route guard — DISABLED. It used to redirect to /login when
//    `access_token` was missing from the incoming request's cookies. That
//    check can never succeed in production: the backend issues access_token
//    as a host-only cookie scoped to api.elhafazah-academy.com (see
//    Back-end/app/core/cookies.py), so it's never present on requests to
//    this app's own domain — this proxy runs server-side against *this*
//    app's cookie jar, not the API's. Real auth enforcement already happens
//    without it: the dashboard shells call GET /users/me on mount and
//    redirect to /login on 401, and the backend enforces auth on every API
//    call regardless. See SYSTEM-STATUS.md.
//
// 2. Locale header for <html lang>/<html dir> — the marketing pages
//    (app/page.tsx = English, app/ar/page.tsx = Arabic) need the ROOT
//    layout's <html> tag to carry the right lang/dir per route for SEO and
//    accessibility, but Next only lets the root layout render <html>/<body>
//    and it can't read the current pathname directly. Stamping it onto a
//    response header here — read back via headers() in app/layout.tsx — is
//    the standard app-router workaround.
export function proxy(request: NextRequest): ReturnType<typeof NextResponse.next> {
  const response = NextResponse.next();
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  // Everything except Next internals and static files — a superset of the
  // old dashboard-only matcher, since the locale header is needed site-wide.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml)$).*)'],
};

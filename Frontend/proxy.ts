import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Server-side route guard for /dashboard/*: the backend sets access_token as
// an HttpOnly cookie, which this proxy (running server-side) can read even
// though client-side JS can't. This only avoids flashing protected UI at a
// logged-out visitor — the backend still enforces auth on every API request
// regardless of what this check does.
export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

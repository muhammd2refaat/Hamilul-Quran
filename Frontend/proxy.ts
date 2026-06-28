import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  // Extract token from cookies or auth headers if possible, but since we are
  // using localStorage for tokens (per requirements, because it's a SPA-style auth),
  // Next.js middleware cannot read localStorage. 
  // However, we can check if the route is /dashboard and maybe do a basic check or let the client handle it.
  // Wait, if the user specifically requested Next.js middleware, standard practice is to store tokens in cookies.
  // Since the user asked: "store the access token securely (e.g., memory or secure HttpOnly cookie) and attach it"
  // Let's assume we might switch to cookies. For now, we will do a basic check if there is a cookie, 
  // but if we used localStorage, middleware can't read it.
  // I will check for 'access_token' cookie, but if it doesn't exist, I will redirect to login.
  // To make it work with the current login code which uses localStorage, I will implement a simpler check
  // or add a note. Actually, I can just write the middleware to check for a cookie, and I will update login to also set a cookie
  // for the middleware to read.
  
  const token = request.cookies.get('access_token')?.value;
  
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*'],
};

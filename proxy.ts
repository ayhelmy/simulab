/**
 * Next.js 16 Proxy (formerly Middleware).
 * SRS §4.1 AUTH-03: redirect unauthenticated users to /login.
 * Uses an optimistic check — full token verification happens server-side.
 * File must be named proxy.ts (not middleware.ts) in Next.js 16.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Only these path prefixes require authentication.
// Everything else (landing page, public sim pages, marketing pages) is open.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/simulations',
  '/courses',
  '/gradebook',
  '/messages',
  '/analytics',
  '/users',
  '/institutions',
  '/simulation-catalogs',
  '/roles',
  '/settings',
  '/audit-logs',
  '/profile',
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and API routes through
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Not a protected route — landing page, auth pages, marketing pages, /sim/... all pass through.
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  // Optimistic auth check: refresh cookie presence = likely authenticated.
  // Actual token validation happens in server components / route handlers.
  const hasRefreshCookie = request.cookies.has('refreshToken');

  if (!hasRefreshCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|Virtual-logo.ico).*)'],
};

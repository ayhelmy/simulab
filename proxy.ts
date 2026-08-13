/**
 * Next.js 16 Proxy (formerly Middleware).
 * File must be named proxy.ts (not middleware.ts) in Next.js 16.
 *
 * This used to optimistically redirect unauthenticated users away from
 * protected routes by checking for a `refreshToken` cookie. That check can
 * never work: the cookie is set by the backend on its own domain
 * (railway.app) with no explicit Domain attribute, so it's host-only and
 * never sent on requests to this frontend's domain (vercel.app) — the
 * Vercel-side proxy can never see it. The check was always false, so every
 * navigation to a protected route bounced back to /login regardless of
 * actual auth state, even for a freshly logged-in user.
 *
 * Auth is enforced correctly elsewhere: the API rejects unauthenticated
 * requests (Bearer token), and the client-side layouts (e.g.
 * app/(dashboard)/layout.tsx) redirect to /login using the real in-memory
 * auth state once it's loaded.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|Virtual-logo.ico).*)'],
};

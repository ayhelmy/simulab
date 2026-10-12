'use client';

/**
 * Redirects to /unauthorized if the user does not hold ANY of the required
 * roles. Mirrors hooks/useRouteGuard.ts (permission-based) but keyed on role
 * name — used to guard the 6 role-specific dashboard routes so a direct URL
 * visit to another role's dashboard doesn't render (the backend route is the
 * real enforcement boundary; this is the frontend half of defense-in-depth).
 * Returns true when access is allowed, false while pending redirect.
 *
 * Usage:
 *   const allowed = useRoleRouteGuard('instructor');
 *   if (!allowed) return null;
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

export function useRoleRouteGuard(...requiredAny: UserRole[]): boolean {
  const { hasRole, loading } = useAuth();
  const router = useRouter();

  const allowed = requiredAny.some((r) => hasRole(r));

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace('/unauthorized');
    }
  }, [loading, allowed, router]);

  return allowed;
}

'use client';

/**
 * Redirects to /unauthorized if the user lacks ALL of the required permissions.
 * Returns true when access is allowed, false while pending redirect.
 * Pages should render null when this returns false to prevent any flash of admin UI.
 *
 * Usage:
 *   const allowed = useRouteGuard('users.view_institution', 'users.view_all');
 *   if (!allowed) return null;
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useRouteGuard(...requiredAny: string[]): boolean {
  const { hasPermission } = useAuth();
  const router = useRouter();

  const allowed = requiredAny.some((p) => hasPermission(p));

  useEffect(() => {
    if (!allowed) {
      router.replace('/unauthorized');
    }
  }, [allowed, router]);

  return allowed;
}

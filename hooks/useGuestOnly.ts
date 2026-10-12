'use client';

/**
 * Redirects an already-authenticated user away from a guest-only page (login,
 * register, etc.) to `next` (or /dashboard). Returns true once it's safe to
 * render the guest page — pages should render a spinner/null until then to
 * avoid a flash of the form before the redirect fires.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function useGuestOnly(): boolean {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      const next = searchParams.get('next') || '/dashboard';
      router.replace(next);
    }
  }, [user, loading, router, searchParams]);

  return !loading && !user;
}

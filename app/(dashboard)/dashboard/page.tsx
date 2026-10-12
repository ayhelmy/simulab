'use client';

/**
 * Dashboard redirector — /dashboard has no UI of its own. It picks the
 * user's highest-ranked held role (same rank order the backend uses to
 * resolve GET /dashboard/me) and forwards to the matching role dashboard.
 * Guests never reach here (the (dashboard) layout redirects unauthenticated
 * users to /login before this renders).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';

const ROLE_ROUTE: Record<Exclude<UserRole, 'guest'>, string> = {
  super_admin: '/dashboard/platform',
  institution_admin: '/dashboard/institution',
  dept_manager: '/dashboard/department',
  instructor: '/dashboard/instructor',
  teaching_assistant: '/dashboard/ta',
  student: '/dashboard/student',
};

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 0, institution_admin: 1, dept_manager: 2,
  instructor: 3, teaching_assistant: 4, student: 5, guest: 6,
};

export default function DashboardRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !user.roles.length) {
      router.replace('/login');
      return;
    }
    const highestRole = user.roles.reduce((best, r) => (
      ROLE_RANK[r.name] < ROLE_RANK[best.name] ? r : best
    ), user.roles[0]).name;

    if (highestRole === 'guest') {
      router.replace('/login');
      return;
    }
    router.replace(ROLE_ROUTE[highestRole]);
  }, [user, loading, router]);

  return <DashboardSkeleton />;
}

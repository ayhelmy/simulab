'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRoleRouteGuard } from '@/hooks/useRoleRouteGuard';
import { getInstructorDashboard, type TeachingDashboard } from '@/lib/dashboard';
import TeachingDashboardView from '@/components/dashboard/TeachingDashboardView';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';
import styles from '@/components/layout/BedoAppSkin.module.css';

export default function InstructorDashboardPage() {
  const allowed = useRoleRouteGuard('instructor');
  const { user } = useAuth();
  const [data, setData] = useState<TeachingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getInstructorDashboard()
      .then(setData)
      .catch(() => setError('Failed to load the instructor dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;
  if (loading && !data) return <div className={styles.root}><DashboardSkeleton /></div>;
  if (error) return <div className={styles.root}><DashboardErrorState message={error} onRetry={load} /></div>;
  if (!data || !user) return null;

  return <TeachingDashboardView data={data} firstName={user.firstName} role="instructor" />;
}

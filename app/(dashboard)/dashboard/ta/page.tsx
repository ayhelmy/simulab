'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRoleRouteGuard } from '@/hooks/useRoleRouteGuard';
import { getTaDashboard, type TeachingDashboard } from '@/lib/dashboard';
import TeachingDashboardView from '@/components/dashboard/TeachingDashboardView';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';

export default function TaDashboardPage() {
  const allowed = useRoleRouteGuard('teaching_assistant');
  const { user } = useAuth();
  const [data, setData] = useState<TeachingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTaDashboard()
      .then(setData)
      .catch(() => setError('Failed to load your dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;
  if (loading && !data) return <DashboardSkeleton />;
  if (error) return <DashboardErrorState message={error} onRetry={load} />;
  if (!data || !user) return null;

  return <TeachingDashboardView data={data} firstName={user.firstName} role="teaching_assistant" />;
}

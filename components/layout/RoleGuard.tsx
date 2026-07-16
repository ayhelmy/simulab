'use client';

/**
 * RoleGuard — renders children only if the current user has one of the required roles.
 * SRS §12 RBAC — used throughout UI to show/hide elements by role.
 *
 * Usage: <RoleGuard roles={['instructor', 'super_admin']}><CreateCourseButton /></RoleGuard>
 */

import React from 'react';
import type { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface RoleGuardProps {
  roles: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const { hasRole } = useAuth();
  const allowed = roles.some((r) => hasRole(r));
  return allowed ? <>{children}</> : <>{fallback}</>;
}

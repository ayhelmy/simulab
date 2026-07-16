'use client';

/**
 * PermissionGuard — renders children only if the user has the required permission code.
 * SRS §12: fine-grained permission-based UI visibility.
 *
 * Usage: <PermissionGuard permission="grades.override"><OverrideButton /></PermissionGuard>
 */

import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface PermissionGuardProps {
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function PermissionGuard({ permission, fallback = null, children }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}

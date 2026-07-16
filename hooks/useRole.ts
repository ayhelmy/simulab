'use client';

import { useAuth } from '@/context/AuthContext';
import { hasRole } from '@/lib/utils';
import type { UserRole } from '@/types';

export function useRole(...roles: UserRole[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return hasRole(user.roles, ...roles);
}

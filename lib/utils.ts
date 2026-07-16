import type { RoleInfo, UserRole } from '@/types';

/** Check if a user's RoleInfo array includes any of the required role names. */
export function hasRole(userRoles: RoleInfo[], ...required: UserRole[]): boolean {
  return required.some((r) => userRoles.some((ur) => ur.name === r));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function buildQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

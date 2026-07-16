import type { User, UserRole } from '@/types';

export function isSuperAdmin(user: User | null): boolean {
  return user?.roles.some((r) => r.name === 'super_admin') ?? false;
}

export function isInstitutionAdmin(user: User | null): boolean {
  return user?.roles.some((r) => r.name === 'institution_admin') ?? false;
}

export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.some((r) => user.roles.some((ur) => ur.name === r));
}

export function hasPermission(user: User | null, permission: string): boolean {
  return user?.permissions.includes(permission) ?? false;
}

export function hasAnyPermission(user: User | null, ...permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

export function canAccessInstitution(user: User | null, institutionId: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return user.institutionId === institutionId;
}

export function canAccessDepartment(user: User | null, departmentId: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user) || isInstitutionAdmin(user)) return true;
  return user.managedDepartments?.includes(departmentId) ?? false;
}

/** Returns true if actor is permitted to assign the given role to another user. */
export function canAssignRole(actor: User | null, targetRole: UserRole): boolean {
  if (!actor) return false;
  if (isSuperAdmin(actor)) return true;
  const superOnlyRoles: UserRole[] = ['super_admin', 'institution_admin'];
  if (superOnlyRoles.includes(targetRole)) return false;
  return actor.permissions.includes('users.assign_roles');
}

/** Returns true if actor can edit/suspend/delete the target user. */
export function canManageUser(actor: User | null, target: User): boolean {
  if (!actor) return false;
  if (isSuperAdmin(actor)) return true;
  if (actor.permissions.includes('users.update_institution') && actor.institutionId === target.institutionId) return true;
  if (actor.permissions.includes('users.update_department')) {
    const sharedDept = actor.managedDepartments?.some((d) => target.managedDepartments?.includes(d));
    if (sharedDept) return true;
  }
  return false;
}

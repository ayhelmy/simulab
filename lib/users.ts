/**
 * Users & roles API helpers — SRS §4.2 USR-01 to USR-06; §4.3 PERM-01 to PERM-04.
 */

import { api, getAccessToken } from './api';
import { API_BASE_URL } from './constants';
import type { User, RoleInfo } from '@/types';
import type { PaginationMeta } from '@/types/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'suspended' | 'pending';
  role?: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  status?: 'active' | 'suspended' | 'pending';
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  label: string;
  description?: string;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
}

export interface ImportPreview {
  valid: Array<{ email: string; firstName: string; lastName: string; role: string }>;
  errors: Array<{ row: number; email: string; errors: string[] }>;
  summary: { total: number; validCount: number; errorCount: number };
}

export interface ImportResult {
  created: Array<{ email: string; id: string }>;
  failed:  Array<{ email: string; error: string }>;
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

export async function listUsers(query: UsersQuery = {}): Promise<{ users: User[]; meta: PaginationMeta }> {
  const res = await api.get<User[]>('/users', query as Record<string, unknown>);
  return { users: res.data, meta: res.meta! };
}

export async function getUser(id: string): Promise<User> {
  const res = await api.get<User>(`/users/${id}`);
  return res.data;
}

export async function createUser(data: CreateUserData): Promise<User> {
  const res = await api.post<User>('/users', data);
  return res.data;
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const res = await api.patch<User>(`/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function changePassword(
  id: string,
  data: { currentPassword?: string; newPassword: string },
): Promise<void> {
  await api.patch(`/users/${id}/password`, data);
}

// ── Role assignment ───────────────────────────────────────────────────────────

export async function getUserRoles(id: string): Promise<RoleInfo[]> {
  const res = await api.get<RoleInfo[]>(`/users/${id}/roles`);
  return res.data;
}

export async function assignRole(userId: string, roleName: string): Promise<RoleInfo[]> {
  const res = await api.post<RoleInfo[]>(`/users/${userId}/roles`, { roleName });
  return res.data;
}

export async function revokeRole(userId: string, roleId: string): Promise<void> {
  await api.delete(`/users/${userId}/roles/${roleId}`);
}

// ── Bulk import ───────────────────────────────────────────────────────────────

export async function importValidate(file: File): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/users/import/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ title: res.statusText, status: res.status }));
    throw err;
  }

  const json = await res.json();
  return json.data as ImportPreview;
}

export async function importConfirm(rows: ImportPreview['valid']): Promise<ImportResult> {
  const res = await api.post<ImportResult>('/users/import/confirm', { rows });
  return res.data;
}

// ── Role management ───────────────────────────────────────────────────────────

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const res = await api.get<RoleWithPermissions[]>('/roles');
  return res.data;
}

export async function listAllPermissions(): Promise<Permission[]> {
  const res = await api.get<Permission[]>('/roles/permissions');
  return res.data;
}

export async function createRole(data: {
  name: string;
  label: string;
  description?: string;
  permissionCodes: string[];
}): Promise<RoleWithPermissions> {
  const res = await api.post<RoleWithPermissions>('/roles', data);
  return res.data;
}

export async function addRolePermission(roleId: string, permissionCode: string): Promise<Permission[]> {
  const res = await api.post<Permission[]>(`/roles/${roleId}/permissions`, { permissionCode });
  return res.data;
}

export async function removeRolePermission(roleId: string, permId: string): Promise<void> {
  await api.delete(`/roles/${roleId}/permissions/${permId}`);
}

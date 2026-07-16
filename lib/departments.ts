/**
 * Department API helpers — departments CRUD + dept→catalog assignment.
 * Backend routes: /institutions/:id/departments[/:deptId/simulation-catalogs[/:catalogId]]
 */

import { api } from './api';
import type { SimulationCatalog } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Department {
  id:            string;
  institutionId: string;
  name:          string;
  code:          string;
  parentId?:     string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface DepartmentCatalogAssignment extends SimulationCatalog {
  includeSubtree: boolean;
  assignedAt:     string;
}

export interface AssignDeptCatalogData {
  catalogId:       string;
  includeSubtree?: boolean;
}

// ── Department CRUD ───────────────────────────────────────────────────────────

export async function listDepartments(institutionId: string): Promise<Department[]> {
  const res = await api.get<Department[]>(`/institutions/${institutionId}/departments`);
  return res.data ?? [];
}

export async function getDepartment(institutionId: string, deptId: string): Promise<Department> {
  const res = await api.get<Department>(`/institutions/${institutionId}/departments/${deptId}`);
  return res.data;
}

export async function createDepartment(
  institutionId: string,
  data: { name: string; code: string; parentId?: string | null },
): Promise<Department> {
  const res = await api.post<Department>(`/institutions/${institutionId}/departments`, data);
  return res.data;
}

export async function updateDepartment(
  institutionId: string,
  deptId: string,
  data: { name?: string; code?: string },
): Promise<Department> {
  const res = await api.patch<Department>(`/institutions/${institutionId}/departments/${deptId}`, data);
  return res.data;
}

export async function deleteDepartment(institutionId: string, deptId: string): Promise<void> {
  await api.delete(`/institutions/${institutionId}/departments/${deptId}`);
}

// ── Department → Catalog assignment ──────────────────────────────────────────

/** List catalog assignments for a department. */
export async function listDepartmentCatalogs(
  institutionId: string,
  deptId: string,
): Promise<DepartmentCatalogAssignment[]> {
  const res = await api.get<DepartmentCatalogAssignment[]>(
    `/institutions/${institutionId}/departments/${deptId}/simulation-catalogs`,
  );
  return res.data ?? [];
}

/** Assign a catalog to a department (with optional subtree expansion). */
export async function assignCatalogToDepartment(
  institutionId: string,
  deptId: string,
  data: AssignDeptCatalogData,
): Promise<{ departmentId: string; catalogId: string; includeSubtree: boolean; assignedAt: string }> {
  const res = await api.post(
    `/institutions/${institutionId}/departments/${deptId}/simulation-catalogs`,
    data,
  );
  return res.data as { departmentId: string; catalogId: string; includeSubtree: boolean; assignedAt: string };
}

/** Remove a catalog assignment from a department. */
export async function revokeCatalogFromDepartment(
  institutionId: string,
  deptId: string,
  catalogId: string,
): Promise<void> {
  await api.delete(
    `/institutions/${institutionId}/departments/${deptId}/simulation-catalogs/${catalogId}`,
  );
}

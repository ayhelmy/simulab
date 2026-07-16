import { api } from './api';
import type { AcademicYear } from '@/types';

export interface CreateAcademicYearData {
  name: string;
  code?: string;
  yearOrder?: number;
  status?: 'active' | 'inactive' | 'archived';
  startDate?: string;
  endDate?: string;
}

export async function listAcademicYears(departmentId: string): Promise<AcademicYear[]> {
  const res = await api.get<AcademicYear[]>(`/departments/${departmentId}/academic-years`);
  return res.data ?? [];
}

export async function getAcademicYear(id: string): Promise<AcademicYear> {
  const res = await api.get<AcademicYear>(`/academic-years/${id}`);
  return res.data;
}

export async function createAcademicYear(departmentId: string, data: CreateAcademicYearData): Promise<AcademicYear> {
  const res = await api.post<AcademicYear>(`/departments/${departmentId}/academic-years`, data);
  return res.data;
}

export async function updateAcademicYear(id: string, data: Partial<CreateAcademicYearData>): Promise<AcademicYear> {
  const res = await api.patch<AcademicYear>(`/academic-years/${id}`, data);
  return res.data;
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await api.delete(`/academic-years/${id}`);
}

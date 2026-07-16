import { api } from './api';
import type { SemesterTerm, Course } from '@/types';

export interface CreateSemesterTermData {
  name: string;
  code?: string;
  termOrder?: number;
  status?: 'active' | 'inactive' | 'archived';
  startDate?: string;
  endDate?: string;
}

export async function listSemesterTerms(academicYearId: string): Promise<SemesterTerm[]> {
  const res = await api.get<SemesterTerm[]>(`/academic-years/${academicYearId}/semester-terms`);
  return res.data ?? [];
}

export async function getSemesterTerm(id: string): Promise<SemesterTerm> {
  const res = await api.get<SemesterTerm>(`/semester-terms/${id}`);
  return res.data;
}

export async function createSemesterTerm(academicYearId: string, data: CreateSemesterTermData): Promise<SemesterTerm> {
  const res = await api.post<SemesterTerm>(`/academic-years/${academicYearId}/semester-terms`, data);
  return res.data;
}

export async function updateSemesterTerm(id: string, data: Partial<CreateSemesterTermData>): Promise<SemesterTerm> {
  const res = await api.patch<SemesterTerm>(`/semester-terms/${id}`, data);
  return res.data;
}

export async function deleteSemesterTerm(id: string): Promise<void> {
  await api.delete(`/semester-terms/${id}`);
}

export async function getCoursesByTerm(termId: string): Promise<Course[]> {
  const res = await api.get<Course[]>(`/semester-terms/${termId}/courses`);
  return res.data ?? [];
}

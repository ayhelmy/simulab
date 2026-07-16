import { api } from './api';
import type { UserAcademicAssignment } from '@/types';

export interface CreateAssignmentData {
  departmentId: string;
  academicYearId: string;
  semesterTermId: string;
  roleContext: 'instructor' | 'student' | 'teaching_assistant' | 'dept_manager';
}

export async function getMyAcademicAssignment(): Promise<UserAcademicAssignment[]> {
  const res = await api.get<UserAcademicAssignment[]>('/users/me/academic-assignment');
  return res.data ?? [];
}

export async function listUserAcademicAssignments(userId: string): Promise<UserAcademicAssignment[]> {
  const res = await api.get<UserAcademicAssignment[]>(`/users/${userId}/academic-assignments`);
  return res.data ?? [];
}

export async function createAcademicAssignment(userId: string, data: CreateAssignmentData): Promise<UserAcademicAssignment> {
  const res = await api.post<UserAcademicAssignment>(`/users/${userId}/academic-assignments`, data);
  return res.data;
}

export async function updateAcademicAssignment(
  userId: string, assignmentId: string, data: { isCurrent?: boolean },
): Promise<UserAcademicAssignment> {
  const res = await api.patch<UserAcademicAssignment>(`/users/${userId}/academic-assignments/${assignmentId}`, data);
  return res.data;
}

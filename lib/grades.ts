/**
 * Gradebook API helpers — SRS §4.8 GRD-01 to GRD-07.
 */

import { api } from './api';
import type { GradebookResponse, GradeItem, StudentGradesResponse } from '@/types';

export async function getGradebook(courseId: string): Promise<GradebookResponse> {
  const res = await api.get<GradebookResponse>(`/courses/${courseId}/gradebook`);
  return res.data;
}

export async function listGradeItems(courseId: string): Promise<GradeItem[]> {
  const res = await api.get<GradeItem[]>(`/courses/${courseId}/gradebook/items`);
  return res.data ?? [];
}

export async function getStudentGrades(courseId: string, studentId: string): Promise<StudentGradesResponse> {
  const res = await api.get<StudentGradesResponse>(`/courses/${courseId}/gradebook/students/${studentId}`);
  return res.data;
}

export async function submitGrade(
  courseId: string,
  data: { gradeItemId: string; userId: string; score: number; pointsPossible?: number },
): Promise<void> {
  await api.post(`/courses/${courseId}/gradebook/grades`, data);
}

export async function updateGrade(
  courseId: string,
  gradeId: string,
  data: { score?: number; overrideNote?: string },
): Promise<void> {
  await api.patch(`/courses/${courseId}/gradebook/grades/${gradeId}`, data);
}

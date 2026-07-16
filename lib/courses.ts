/**
 * Courses API helpers — SRS §4.5 CRS-01 to CRS-07; §7.2 enrollment flow; §10.3 Courses API.
 */

import { api } from './api';
import type { Course, Enrollment, SimulationCatalog } from '@/types';
import type { ApiError, PaginationMeta } from '@/types/api';
import type { Simulation } from '@/types';

// ── Query / input types ───────────────────────────────────────────────────────

export interface CourseQuery {
  page?:          number;
  limit?:         number;
  search?:        string;
  status?:        Course['status'];
  domainId?:      string;
  instructorId?:  string;
  institutionId?: string;
}

export interface CreateCourseData {
  title:            string;
  institutionId:    string;
  description?:     string;
  thumbnailUrl?:    string;
  domainId?:        string;
  departmentId:     string;
  academicYearId:   string;
  semesterTermId:   string;
  termId?:          string;
  enrollmentType?:  Course['enrollmentType'];
  enrollmentCap?:   number | null;
  startDate?:       string;
  endDate?:         string;
  passingGrade?:    number;
  settings?:        Record<string, unknown>;
}

export interface UpdateCourseData {
  title?:           string;
  description?:     string;
  thumbnailUrl?:    string;
  domainId?:        string;
  departmentId?:    string | null;
  academicYearId?:  string | null;
  semesterTermId?:  string | null;
  enrollmentType?:  Course['enrollmentType'];
  enrollmentCap?:   number | null;
  startDate?:       string;
  endDate?:         string;
  passingGrade?:    number;
  settings?:        Record<string, unknown>;
}

export interface EnrollData {
  userId?:          string;
  role?:            'student' | 'instructor' | 'teaching_assistant';
  enrollmentCode?:  string;
}

export interface EnrollmentQuery {
  page?:   number;
  limit?:  number;
  role?:   string;
  status?: string;
}

// ── Courses CRUD ──────────────────────────────────────────────────────────────

export async function listCourses(query?: CourseQuery): Promise<{ courses: Course[]; meta: PaginationMeta }> {
  const res = await api.get<Course[]>('/courses', query as Record<string, unknown>);
  return { courses: res.data, meta: res.meta! };
}

export async function getCourse(id: string): Promise<Course> {
  const res = await api.get<Course>(`/courses/${id}`);
  return res.data;
}

export async function createCourse(data: CreateCourseData): Promise<Course> {
  const res = await api.post<Course>('/courses', data);
  return res.data;
}

export async function updateCourse(id: string, data: UpdateCourseData): Promise<Course> {
  const res = await api.patch<Course>(`/courses/${id}`, data);
  return res.data;
}

export async function deleteCourse(id: string): Promise<void> {
  await api.delete(`/courses/${id}`);
}

export async function publishCourse(id: string): Promise<Course> {
  const res = await api.post<Course>(`/courses/${id}/publish`);
  return res.data;
}

export async function archiveCourse(id: string): Promise<Course> {
  const res = await api.post<Course>(`/courses/${id}/archive`);
  return res.data;
}

export async function cloneCourse(id: string, data?: { title?: string }): Promise<Course> {
  const res = await api.post<Course>(`/courses/${id}/clone`, data ?? {});
  return res.data;
}

export async function restoreCourse(id: string): Promise<Course> {
  const res = await api.post<Course>(`/courses/${id}/restore`);
  return res.data;
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export async function listEnrollments(
  courseId: string,
  query?: EnrollmentQuery,
): Promise<{ enrollments: Enrollment[]; meta: PaginationMeta }> {
  const res = await api.get<Enrollment[]>(`/courses/${courseId}/enrollments`, query as Record<string, unknown>);
  return { enrollments: res.data, meta: res.meta! };
}

export async function enrollInCourse(courseId: string, data?: EnrollData): Promise<Enrollment> {
  const res = await api.post<Enrollment>(`/courses/${courseId}/enrollments`, data ?? {});
  return res.data;
}

export async function approveEnrollment(courseId: string, userId: string): Promise<Enrollment> {
  const res = await api.post<Enrollment>(`/courses/${courseId}/enrollments/${userId}/approve`);
  return res.data;
}

export async function unenroll(courseId: string, userId: string): Promise<void> {
  await api.delete(`/courses/${courseId}/enrollments/${userId}`);
}

/** Returns the current user's enrollment for a course, or null if not enrolled. */
export async function getMyEnrollment(courseId: string): Promise<Enrollment | null> {
  try {
    const res = await api.get<Enrollment>(`/courses/${courseId}/enrollments/me`);
    return res.data;
  } catch (err: unknown) {
    if ((err as ApiError)?.status === 404) return null;
    throw err;
  }
}

// ── Course simulation access (department-filtered) ────────────────────────────

/**
 * Returns the catalog tree available to this course.
 * If the course has a department, returns only catalogs assigned to that department.
 * Empty array if no department and no institution assignments.
 */
export async function getCourseCatalogs(courseId: string): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>(`/courses/${courseId}/simulation-catalogs`);
  return res.data ?? [];
}

/**
 * Returns simulations available for use in this course's lessons.
 * Filtered by the course department's catalog assignments, or institution-wide if no dept.
 */
export async function getCourseSimulations(courseId: string): Promise<Simulation[]> {
  const res = await api.get<Simulation[]>(`/courses/${courseId}/simulations`);
  return res.data ?? [];
}

/**
 * Validates that a simulation is accessible for lessons in this course.
 * Throws if the simulation is not in a catalog assigned to the course's department.
 */
export async function validateSimulation(
  courseId: string,
  simulationId: string,
): Promise<{ simulationId: string; title: string; isAllowed: boolean }> {
  const res = await api.post<{ simulationId: string; title: string; isAllowed: boolean }>(
    `/courses/${courseId}/validate-simulation`,
    { simulationId },
  );
  return res.data;
}

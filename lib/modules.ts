/**
 * Modules & Lessons API helpers — SRS §4.6 MOD-01 to MOD-08.
 * Nested under /courses/:courseId/modules[/:moduleId/lessons].
 * Migration 028: lesson_mode, content_type, catalog_id, lesson_completions.
 */

import { api } from './api';
import type { CourseModule, Lesson, LessonMode, ContentType, LessonCompletion } from '@/types';

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateModuleData {
  title:                 string;
  description?:          string;
  position?:             number;
  isPublished?:          boolean;
  unlockAt?:             string | null;
  prerequisiteModuleId?: string | null;
}

export interface UpdateModuleData {
  title?:                string;
  description?:          string;
  position?:             number;
  isPublished?:          boolean;
  unlockAt?:             string | null;
  prerequisiteModuleId?: string | null;
}

/** @deprecated use LessonMode + ContentType */
export type LessonType = 'text' | 'video' | 'file' | 'url' | 'simulation' | 'scorm';

export interface CreateLessonData {
  title:              string;
  lessonMode:         LessonMode;
  contentType?:       ContentType | null;
  content?:           Record<string, unknown>;
  simulationId?:      string | null;
  catalogId?:         string | null;
  estimatedMinutes?:  number | null;
  isRequired?:        boolean;
  isPublished?:       boolean;
  position?:          number;
}

export interface UpdateLessonData {
  title?:             string;
  lessonMode?:        LessonMode;
  contentType?:       ContentType | null;
  content?:           Record<string, unknown>;
  simulationId?:      string | null;
  catalogId?:         string | null;
  estimatedMinutes?:  number | null;
  isRequired?:        boolean;
  isPublished?:       boolean;
}

// ── Modules ───────────────────────────────────────────────────────────────────

export async function listModules(courseId: string): Promise<CourseModule[]> {
  const res = await api.get<CourseModule[]>(`/courses/${courseId}/modules`);
  return res.data ?? [];
}

/** Returns full tree: modules with nested lessons in one request. */
export async function getCourseTree(courseId: string): Promise<CourseModule[]> {
  const res = await api.get<CourseModule[]>(`/courses/${courseId}/modules/tree`);
  return res.data ?? [];
}

export async function createModule(courseId: string, data: CreateModuleData): Promise<CourseModule> {
  const res = await api.post<CourseModule>(`/courses/${courseId}/modules`, data);
  return res.data;
}

export async function updateModule(courseId: string, moduleId: string, data: UpdateModuleData): Promise<CourseModule> {
  const res = await api.patch<CourseModule>(`/courses/${courseId}/modules/${moduleId}`, data);
  return res.data;
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
  await api.delete(`/courses/${courseId}/modules/${moduleId}`);
}

export async function reorderModules(courseId: string, order: string[]): Promise<CourseModule[]> {
  const res = await api.patch<CourseModule[]>(`/courses/${courseId}/modules/reorder`, { order });
  return res.data ?? [];
}

// ── Lessons ───────────────────────────────────────────────────────────────────

export async function listLessons(courseId: string, moduleId: string): Promise<Lesson[]> {
  const res = await api.get<Lesson[]>(`/courses/${courseId}/modules/${moduleId}/lessons`);
  return res.data ?? [];
}

export async function createLesson(courseId: string, moduleId: string, data: CreateLessonData): Promise<Lesson> {
  const res = await api.post<Lesson>(`/courses/${courseId}/modules/${moduleId}/lessons`, data);
  return res.data;
}

export async function updateLesson(
  courseId: string, moduleId: string, lessonId: string, data: UpdateLessonData,
): Promise<Lesson> {
  const res = await api.patch<Lesson>(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, data);
  return res.data;
}

export async function deleteLesson(courseId: string, moduleId: string, lessonId: string): Promise<void> {
  await api.delete(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
}

export async function reorderLessons(
  courseId: string, moduleId: string, order: string[],
): Promise<Lesson[]> {
  const res = await api.patch<Lesson[]>(
    `/courses/${courseId}/modules/${moduleId}/lessons/reorder`,
    { order },
  );
  return res.data ?? [];
}

export async function markLessonComplete(
  courseId: string, moduleId: string, lessonId: string,
): Promise<LessonCompletion> {
  const res = await api.post<LessonCompletion>(
    `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/complete`,
  );
  return res.data;
}

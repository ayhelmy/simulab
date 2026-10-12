/**
 * Quiz attempts API helpers — student-facing attempt-taking lifecycle.
 */

import { api } from './api';
import type { QuizAttempt } from '@/types';

export async function startAttempt(courseId: string, quizId: string): Promise<QuizAttempt> {
  const res = await api.post<QuizAttempt>(`/courses/${courseId}/quizzes/${quizId}/attempts`);
  return res.data;
}

export async function saveResponses(
  courseId: string,
  attemptId: string,
  responses: Array<{ questionId: string; responsePayload: Record<string, unknown> }>,
): Promise<void> {
  await api.patch(`/courses/${courseId}/quiz-attempts/${attemptId}/responses`, { responses });
}

export async function submitAttempt(courseId: string, attemptId: string): Promise<QuizAttempt> {
  const res = await api.post<QuizAttempt>(`/courses/${courseId}/quiz-attempts/${attemptId}/submit`);
  return res.data;
}

export async function getMyAttempts(courseId: string, quizId: string): Promise<QuizAttempt[]> {
  const res = await api.get<QuizAttempt[]>(`/courses/${courseId}/quizzes/${quizId}/attempts/me`);
  return res.data ?? [];
}

export async function getAttempt(courseId: string, quizId: string, attemptId: string): Promise<QuizAttempt> {
  const res = await api.get<QuizAttempt>(`/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`);
  return res.data;
}

export async function gradeAttempt(
  courseId: string,
  attemptId: string,
  responses: Array<{ responseId: string; score: number; feedback?: string }>,
): Promise<QuizAttempt> {
  const res = await api.patch<QuizAttempt>(`/courses/${courseId}/quiz-attempts/${attemptId}/grade`, { responses });
  return res.data;
}

/**
 * Quizzes API helpers — instructor authoring + shared read access.
 * Nested under /courses/:courseId/quizzes[/:quizId/questions].
 */

import { api } from './api';
import type {
  Quiz, QuizQuestion, QuizAttempt, QuestionType,
  QuizAttemptScoringMode, QuizShowPolicy, QuizGradeReleaseMode,
  DifficultyLevel, TaxonomyLevel,
} from '@/types';

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateQuizData {
  title: string;
  lessonId?: string | null;
  moduleId?: string | null;
  description?: string | null;
  instructions?: string | null;
  pointsPossible?: number;
  passingScore?: number | null;
  passingPercentage?: number | null;
  maxAttempts?: number;
  attemptScoringMode?: QuizAttemptScoringMode;
  timeLimitSeconds?: number | null;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  oneQuestionAtATime?: boolean;
  allowBackNavigation?: boolean;
  showScorePolicy?: QuizShowPolicy;
  showAnswersPolicy?: QuizShowPolicy;
  gradeReleaseMode?: QuizGradeReleaseMode;
  availableFrom?: string | null;
  dueAt?: string | null;
  availableUntil?: string | null;
}

export type UpdateQuizData = Partial<CreateQuizData>;

export interface QuestionOptionInput {
  optionIdentifier: string;
  content: string;
  isCorrect: boolean;
  position?: number;
  feedback?: string | null;
}

export interface CreateQuestionData {
  questionType: QuestionType;
  prompt: string;
  title?: string | null;
  points?: number;
  position?: number;
  required?: boolean;
  manualGrading?: boolean;
  shuffleOptions?: boolean;
  difficultyLevel?: DifficultyLevel | null;
  taxonomyLevel?: TaxonomyLevel | null;
  options?: QuestionOptionInput[];
  questionData?: Record<string, unknown>;
}

export type UpdateQuestionData = Partial<CreateQuestionData>;

// ── Quizzes ───────────────────────────────────────────────────────────────────

export async function listQuizzes(courseId: string): Promise<Quiz[]> {
  const res = await api.get<Quiz[]>(`/courses/${courseId}/quizzes`);
  return res.data ?? [];
}

export async function getQuiz(courseId: string, quizId: string): Promise<Quiz> {
  const res = await api.get<Quiz>(`/courses/${courseId}/quizzes/${quizId}`);
  return res.data;
}

export async function createQuiz(courseId: string, data: CreateQuizData): Promise<Quiz> {
  const res = await api.post<Quiz>(`/courses/${courseId}/quizzes`, data);
  return res.data;
}

export async function updateQuiz(courseId: string, quizId: string, data: UpdateQuizData): Promise<Quiz> {
  const res = await api.patch<Quiz>(`/courses/${courseId}/quizzes/${quizId}`, data);
  return res.data;
}

export async function deleteQuiz(courseId: string, quizId: string): Promise<void> {
  await api.delete(`/courses/${courseId}/quizzes/${quizId}`);
}

export async function publishQuiz(courseId: string, quizId: string): Promise<Quiz> {
  const res = await api.post<Quiz>(`/courses/${courseId}/quizzes/${quizId}/publish`);
  return res.data;
}

// ── Questions ─────────────────────────────────────────────────────────────────

export async function listQuestions(courseId: string, quizId: string): Promise<QuizQuestion[]> {
  const res = await api.get<QuizQuestion[]>(`/courses/${courseId}/quizzes/${quizId}/questions`);
  return res.data ?? [];
}

export async function createQuestion(
  courseId: string, quizId: string, data: CreateQuestionData,
): Promise<QuizQuestion> {
  const res = await api.post<QuizQuestion>(`/courses/${courseId}/quizzes/${quizId}/questions`, data);
  return res.data;
}

export async function updateQuestion(
  courseId: string, quizId: string, questionId: string, data: UpdateQuestionData,
): Promise<QuizQuestion> {
  const res = await api.patch<QuizQuestion>(`/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, data);
  return res.data;
}

export async function deleteQuestion(courseId: string, quizId: string, questionId: string): Promise<void> {
  await api.delete(`/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`);
}

export async function reorderQuestions(
  courseId: string, quizId: string, order: string[],
): Promise<QuizQuestion[]> {
  const res = await api.patch<QuizQuestion[]>(`/courses/${courseId}/quizzes/${quizId}/questions/reorder`, { order });
  return res.data ?? [];
}

// ── Instructor attempt review ──────────────────────────────────────────────────

export async function listQuizAttempts(
  courseId: string,
  quizId: string,
  status?: QuizAttempt['status'],
): Promise<QuizAttempt[]> {
  const res = await api.get<QuizAttempt[]>(`/courses/${courseId}/quizzes/${quizId}/attempts`, status ? { status } : undefined);
  return res.data ?? [];
}

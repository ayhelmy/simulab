/**
 * FM103 LMS event-contract API client (WEB-DEVELOPER-GUIDE.md schemaVersion 2.1).
 * Talks to the backend's experiments module — additive to, and independent
 * of, lib/simulation-activity.ts's click/keydown heatmap tracking.
 */

import { api } from './api';

export interface SimulationEventPayload {
  schemaVersion: string;
  eventId: string;
  sessionId: string;
  experimentAttemptId: string;
  projectId: string;
  projectVersion?: string;
  assessmentVersion?: string;
  experimentId: string;
  eventType: string;
  timestamp: string;
  stepNumber?: number;
  /** Schema 1.0 legacy shape only — schema 2.1 sends stepNumber instead. */
  stepId?: string;
  questionId?: string;
  questionType?: string;
  answer?: string;
  attempt: number;
  projectManifest?: unknown;
}

export interface EventIngestResult {
  eventId: string | null;
  status: 'stored' | 'duplicate' | 'rejected';
  reason?: string;
}

/** Single-event ingest. Prefer postEventsBatch from the durable queue's flush loop. */
export async function postEvent(payload: SimulationEventPayload): Promise<EventIngestResult> {
  const res = await api.post<EventIngestResult>('/experiments/events', payload);
  return res.data;
}

/** Ordered batch ingest — each event gets its own status, one bad event never aborts the rest. */
export async function postEventsBatch(events: SimulationEventPayload[]): Promise<EventIngestResult[]> {
  const res = await api.post<EventIngestResult[]>('/experiments/events', { events });
  return res.data ?? [];
}

export interface ExperimentQuestionResult {
  questionId: string;
  required: boolean;
  latestAttempt: number;
  answer: string | null;
  result: 'pending' | 'correct' | 'incorrect';
}

export interface ExperimentProgress {
  experimentAttemptId: string | null;
  attemptStatus: 'active' | 'completed' | 'aborted' | null;
  stepNumerator: number;
  stepDenominator: number;
  stepPercentage: number | null;
  questionResults: ExperimentQuestionResult[];
}

export async function getExperimentProgress(params: {
  projectId: string;
  assessmentVersion: string;
  experimentId: string;
  experimentAttemptId?: string;
}): Promise<ExperimentProgress> {
  const res = await api.get<ExperimentProgress>('/experiments/progress', params as Record<string, unknown>);
  return res.data!;
}

export interface ExperimentCompletion {
  experimentId: string;
  completionStatus: 'incomplete' | 'completed';
  stepNumerator: number;
  stepDenominator: number | null;
  grade: number | null;
  sourceAttemptId: string;
  sourceProjectVersion: string;
  completedAt: string;
}

/** Guide §8 lookup — call before showing a new required assignment. */
export async function getExperimentCompletion(params: {
  projectId: string;
  assessmentVersion: string;
  experimentId: string;
}): Promise<ExperimentCompletion | null> {
  const res = await api.get<ExperimentCompletion | null>('/experiments/completion', params as Record<string, unknown>);
  return res.data ?? null;
}

export interface ExperimentAttemptSummary {
  experimentAttemptId: string;
  sessionId: string;
  projectVersion: string;
  assessmentVersion: string;
  experimentId: string;
  status: 'active' | 'completed' | 'aborted';
  startedAt: string;
  endedAt: string | null;
}

export async function getExperimentHistory(projectId: string): Promise<ExperimentAttemptSummary[]> {
  const res = await api.get<ExperimentAttemptSummary[]>('/experiments/history', { projectId });
  return res.data ?? [];
}

// ── Instructor dashboard (per course, per simulation, per experiment) ────────
// Modeled on the FM103 standalone harness's own dashboard: course-wide
// step-funnel/timing charts + KPI tiles, plus one card per student — all for
// a single selected experiment, returned in one call.

export interface ExperimentCatalogEntry {
  experimentId: string;
  title: string | null;
}

export interface ExperimentStepStatus {
  stepNumber: number;
  required: boolean;
  status: 'pending' | 'started' | 'completed' | 'failed' | 'retried';
  durationSeconds: number | null;
}

export interface ExperimentStudentAttempt {
  experimentAttemptId: string;
  status: 'active' | 'completed' | 'aborted';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  steps: ExperimentStepStatus[];
  questions: ExperimentQuestionResult[];
  correctAnswers: number;
  wrongAnswers: number;
}

export interface ExperimentDashboardStudent {
  studentId: string;
  name: string;
  email: string;
  attempts: ExperimentStudentAttempt[];
}

export interface ExperimentFunnelStep {
  stepNumber: number;
  required: boolean;
  reachedCount: number;
  completedCount: number;
}

export interface ExperimentTimingStep {
  stepNumber: number;
  avgDurationSeconds: number;
  sampleCount: number;
}

export interface ExperimentDashboardOverview {
  attemptCount: number;
  completedCount: number;
  studentCount: number;
  correct: number;
  incorrect: number;
  medianDurationSeconds: number | null;
  eventCount: number;
  stepPercentage: number | null;
}

export interface ExperimentDashboardResponse {
  projectId: string;
  experiments: ExperimentCatalogEntry[];
  selectedExperimentId: string | null;
  overview: ExperimentDashboardOverview;
  funnel: ExperimentFunnelStep[];
  timing: ExperimentTimingStep[];
  students: ExperimentDashboardStudent[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

/** Instructor-only: course-wide charts/KPIs + every student's detail, for one experiment. */
export async function getExperimentDashboard(
  courseId: string,
  simulationId: string,
  params?: { experimentId?: string; page?: number; limit?: number },
): Promise<ExperimentDashboardResponse> {
  const res = await api.get<ExperimentDashboardResponse>(
    `/courses/${courseId}/simulations/${simulationId}/experiments-analytics/dashboard`,
    params as Record<string, unknown>,
  );
  return res.data!;
}

/**
 * Simulation Activity API helpers.
 * Tracks when users enter/exit course lesson simulations.
 * All duration calculations are server-side; the client only stores session IDs.
 */

import { api, getAccessToken } from './api';
import { API_BASE_URL } from './constants';
import type {
  ActivityStartResult,
  ActivityEndResult,
  ActivityExitReason,
  SimulationActivitySession,
  InstructorActivitySession,
  CourseActivitySummary,
  LatestActivitySession,
} from '@/types';
import type { PaginationMeta } from '@/types/api';

// ── Click event type ──────────────────────────────────────────────────────────

export interface ClickEvent {
  sequence_no: number;
  event_type:  'click' | 'keydown';
  x:           number | null;
  y:           number | null;
  norm_x:      number | null;
  norm_y:      number | null;
  key_name:    string | null;
  clicked_at:  string; // ISO 8601
}

// ── Query parameter types ─────────────────────────────────────────────────────

export interface ActivityListQuery {
  course_id?:     string;
  lesson_id?:     string;
  simulation_id?: string;
  student_id?:    string;
  status?:        string;
  date_from?:     string;
  date_to?:       string;
  page?:          number;
  limit?:         number;
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

/**
 * Start an activity session for a course lesson simulation.
 * Returns session ID, launch URL, and simulation metadata.
 * Call this instead of getLessonSimulationLaunch when tracking is active.
 */
export async function startSimulationActivity(
  courseId: string,
  lessonId: string,
  simulationId?: string | null,
): Promise<ActivityStartResult> {
  const res = await api.post<ActivityStartResult>(
    `/courses/${courseId}/lessons/${lessonId}/simulation-activity/start`,
    simulationId ? { simulation_id: simulationId } : {},
  );
  return res.data;
}

/** Send periodic heartbeat to keep session alive. Fire-and-forget is intentional. */
export async function sendHeartbeat(sessionId: string): Promise<void> {
  await api.post(`/simulation-activity/${sessionId}/heartbeat`);
}

/**
 * End an activity session.
 * Prefer calling this explicitly on clean exits.
 * For browser-close scenarios, use endActivityBeacon() instead.
 */
export async function endSimulationActivity(
  sessionId: string,
  exitReason: ActivityExitReason = 'user_exit',
): Promise<ActivityEndResult> {
  const res = await api.post<ActivityEndResult>(
    `/simulation-activity/${sessionId}/end`,
    { exit_reason: exitReason },
  );
  return res.data;
}

/**
 * End a session using fetch with keepalive: true.
 * Use on pagehide / visibilitychange so the request survives page unload.
 * Does not throw — it is best-effort.
 */
export function endActivityBeacon(
  sessionId: string,
  exitReason: ActivityExitReason = 'browser_close',
): void {
  const token   = getAccessToken();
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  fetch(`${baseUrl}/simulation-activity/${sessionId}/end`, {
    method:    'POST',
    keepalive: true,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ exit_reason: exitReason }),
  }).catch(() => {});
}

// ── Student views ─────────────────────────────────────────────────────────────

export async function listMySimulationActivity(
  query?: ActivityListQuery,
): Promise<{ sessions: SimulationActivitySession[]; meta: PaginationMeta }> {
  const res = await api.get<SimulationActivitySession[]>(
    '/users/me/simulation-activity',
    query as Record<string, unknown>,
  );
  return { sessions: res.data ?? [], meta: res.meta! };
}

/** Latest completed session for a lesson (shown on course home page). */
export async function getLatestActivityForLesson(
  lessonId: string,
  simulationId: string,
): Promise<LatestActivitySession | null> {
  const res = await api.get<LatestActivitySession | null>(
    `/lessons/${lessonId}/simulation-activity/latest`,
    { simulation_id: simulationId },
  );
  return res.data ?? null;
}

// ── Instructor / admin views ──────────────────────────────────────────────────

export async function listCourseSimulationActivity(
  courseId: string,
  query?: ActivityListQuery,
): Promise<{
  sessions: InstructorActivitySession[];
  summary:  CourseActivitySummary;
  meta:     PaginationMeta;
}> {
  const res = await api.get<{ sessions: InstructorActivitySession[]; summary: CourseActivitySummary }>(
    `/courses/${courseId}/simulation-activity`,
    query as Record<string, unknown>,
  );
  return {
    sessions: res.data?.sessions ?? [],
    summary:  res.data?.summary  ?? {
      totalLaunches: 0, uniqueStudents: 0,
      totalDurationSeconds: 0, avgDurationSeconds: 0,
      formattedTotalDuration: '0s', formattedAvgDuration: '0s',
    },
    meta: res.meta!,
  };
}

// ── Click position tracking ───────────────────────────────────────────────────

/** Batch-send collected click positions to the backend. */
export async function recordClicksBatch(
  sessionId: string,
  clicks:    ClickEvent[],
): Promise<{ inserted: number }> {
  const res = await api.post<{ inserted: number }>(
    `/simulation-activity/${sessionId}/clicks`,
    { clicks },
  );
  return res.data ?? { inserted: 0 };
}

// ── Click stats (instructor "Component Interaction Summary" view) ────────────

// ── Simulation-level analytics ────────────────────────────────────────────────

export interface SimulationAnalytics {
  summary: {
    totalSessions:        number;
    activeSessions:       number;
    uniqueStudents:       number;
    totalClicks:          number;
    avgDurationSeconds:   number;
    formattedAvgDuration: string;
    avgClicksPerSession:  number;
    completionRate:       number;
    componentsReached:    number;
  };
  componentStats: {
    rank:         number;
    category:     string;
    interactions: number;
    percentage:   number;
  }[];
  dailyActivity:    { date: string; sessions: number; avgDuration: number }[];
  scatterPoints:    { normX: number; normY: number; category: string }[];
  regions:          { name: string; normX: number; normY: number; normW: number; normH: number }[];
  referenceImageUrl: string | null;
  recentSessions: {
    id:                string;
    studentName:       string;
    studentEmail:      string | null;
    status:            string;
    startedAt:         string;
    endedAt:           string | null;
    durationSeconds:   number;
    formattedDuration: string;
    clicks:            number;
    firstClickDelay:   number | null;
  }[];
}

export async function getSimulationAnalytics(
  courseId: string,
  simulationId: string,
): Promise<SimulationAnalytics> {
  const res = await api.get<SimulationAnalytics>(
    `/courses/${courseId}/simulations/${simulationId}/analytics`,
  );
  return res.data!;
}

export interface ClickEventRow {
  sequenceNo: number;
  time:       string; // elapsed HH:MM:SS from session start
  category:   string;
  x:          number | null;
  y:          number | null;
}

export interface ClickEventsResult {
  events:      ClickEventRow[];
  totalClicks: number;
}

/** Individual click events in sequence order, Uncategorized rows excluded. */
export async function getSessionClickEvents(sessionId: string): Promise<ClickEventsResult> {
  const res = await api.get<ClickEventsResult>(`/simulation-activity/${sessionId}/click-events`);
  return res.data ?? { events: [], totalClicks: 0 };
}

export interface ClickCategoryStat {
  rank:            number;
  category:        string;
  interactions:    number;
  percentage:      number; // share of total clicks for this session, 0-100
  lastInteraction: string; // elapsed HH:MM:SS from session start
}

export interface ClickStatsResult {
  totalClicks: number;
  stats:       ClickCategoryStat[];
}

/** Aggregated per-component click counts for a session, ranked by volume. */
export async function getSessionClickStats(sessionId: string): Promise<ClickStatsResult> {
  const res = await api.get<ClickStatsResult>(`/simulation-activity/${sessionId}/click-stats`);
  return res.data ?? { totalClicks: 0, stats: [] };
}

/**
 * Flush remaining clicks on page unload using keepalive fetch.
 * Best-effort — silently ignores errors.
 */
export function flushClicksBeacon(sessionId: string, clicks: ClickEvent[]): void {
  if (clicks.length === 0) return;
  const token   = getAccessToken();
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  fetch(`${baseUrl}/simulation-activity/${sessionId}/clicks`, {
    method:    'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ clicks }),
  }).catch(() => {});
}

/**
 * Download click CSV for a session.
 * Uses the same auth + credential setup as the api client to avoid CORS/401 issues.
 * Triggers a file-save dialog.
 */
export async function downloadSessionClicksCsv(sessionId: string): Promise<void> {
  const token = getAccessToken();
  const url   = `${API_BASE_URL}/simulation-activity/${sessionId}/clicks/csv`;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method:      'GET',
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    // Parse the RFC 7807 error body the same way the api client does
    const err = await res.json().catch(() => ({
      title:  res.statusText,
      detail: `HTTP ${res.status}`,
      status: res.status,
    }));
    throw err;
  }

  const blob    = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = blobUrl;
  a.download    = `session_${sessionId}_clicks.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function listLessonSimulationActivity(
  courseId: string,
  lessonId: string,
  query?: ActivityListQuery,
): Promise<{ sessions: InstructorActivitySession[]; meta: PaginationMeta }> {
  const res = await api.get<InstructorActivitySession[]>(
    `/courses/${courseId}/lessons/${lessonId}/simulation-activity`,
    query as Record<string, unknown>,
  );
  return { sessions: res.data ?? [], meta: res.meta! };
}

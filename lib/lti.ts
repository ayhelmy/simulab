/**
 * LTI 1.3 integration API helpers — admin platform registry, tool signing
 * keys, and launch logs (Phase 1: registration + security).
 */

import { api } from './api';
import type { LtiPlatform, LtiPlatformDetail, LtiDeployment, LtiToolKey } from '@/types';
import type { PaginationMeta } from '@/types/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LtiPlatformQuery {
  page?:   number;
  limit?:  number;
  search?: string;
  institutionId?: string;
}

export interface CreateLtiPlatformData {
  institutionId?: string;
  platformName:   string;
  issuer:         string;
  clientId:       string;
  authLoginUrl:   string;
  authTokenUrl:   string;
  jwksUrl:        string;
}

export interface UpdateLtiPlatformData {
  platformName?: string;
  issuer?:       string;
  clientId?:     string;
  authLoginUrl?: string;
  authTokenUrl?: string;
  jwksUrl?:      string;
}

export interface LtiLaunchLog {
  id: string;
  institutionId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  delta: Record<string, unknown> | null;
  ipAddress: string | null;
  occurredAt: string;
}

export interface LtiLaunchDetails {
  sub: string;
  issuer: string;
  platformId: string;
  platformName: string;
  deploymentId: string | null;
  messageType: string | null;
  version: string | null;
  contextId: string | null;
  contextLabel: string | null;
  contextTitle: string | null;
  resourceLinkId: string | null;
  resourceLinkTitle: string | null;
  roles: string[];
  launchedAt: string;
}

// ── Platforms ─────────────────────────────────────────────────────────────────

export async function listLtiPlatforms(query?: LtiPlatformQuery): Promise<{ platforms: LtiPlatform[]; meta: PaginationMeta }> {
  const res = await api.get<LtiPlatform[]>('/lti-platforms', query as Record<string, unknown>);
  return { platforms: res.data, meta: res.meta! };
}

export async function getLtiPlatform(id: string): Promise<LtiPlatformDetail> {
  const res = await api.get<LtiPlatformDetail>(`/lti-platforms/${id}`);
  return res.data;
}

export async function createLtiPlatform(data: CreateLtiPlatformData): Promise<LtiPlatform> {
  const res = await api.post<LtiPlatform>('/lti-platforms', data);
  return res.data;
}

export async function updateLtiPlatform(id: string, data: UpdateLtiPlatformData): Promise<LtiPlatform> {
  const res = await api.patch<LtiPlatform>(`/lti-platforms/${id}`, data);
  return res.data;
}

export async function activateLtiPlatform(id: string): Promise<LtiPlatform> {
  const res = await api.post<LtiPlatform>(`/lti-platforms/${id}/activate`);
  return res.data;
}

export async function deactivateLtiPlatform(id: string): Promise<LtiPlatform> {
  const res = await api.post<LtiPlatform>(`/lti-platforms/${id}/deactivate`);
  return res.data;
}

// ── Deployments ───────────────────────────────────────────────────────────────

export async function addLtiDeployment(platformId: string, data: { deploymentId: string; label?: string }): Promise<LtiDeployment> {
  const res = await api.post<LtiDeployment>(`/lti-platforms/${platformId}/deployments`, data);
  return res.data;
}

export async function removeLtiDeployment(platformId: string, deploymentId: string): Promise<void> {
  await api.delete(`/lti-platforms/${platformId}/deployments/${deploymentId}`);
}

// ── Tool signing keys ─────────────────────────────────────────────────────────

export async function listLtiKeys(): Promise<LtiToolKey[]> {
  const res = await api.get<LtiToolKey[]>('/lti-platforms/keys');
  return res.data;
}

export async function rotateLtiKey(): Promise<LtiToolKey> {
  const res = await api.post<LtiToolKey>('/lti-platforms/keys/rotate');
  return res.data;
}

// ── Launch logs ───────────────────────────────────────────────────────────────

export async function listLtiLaunchLogs(query?: { page?: number; limit?: number }): Promise<{ logs: LtiLaunchLog[]; meta: PaginationMeta }> {
  const res = await api.get<LtiLaunchLog[]>('/lti-platforms/launch-logs', query as Record<string, unknown>);
  return { logs: res.data, meta: res.meta! };
}

// ── Public launch-details lookup (used by /lti/launching, no auth) ──────────

export async function getLtiLaunchDetails(token: string): Promise<LtiLaunchDetails> {
  const res = await api.get<LtiLaunchDetails>('/lti/launch-details', { token });
  return res.data;
}

// ── Session exchange (resource-link launch -> real SimuLearn session) ───────

export interface LtiSessionExchangeResult {
  accessToken: string;
  user: import('@/types').User;
  courseId: string;
  lessonId: string;
  simulationId: string;
}

export async function exchangeLtiSession(token: string): Promise<LtiSessionExchangeResult> {
  const res = await api.get<LtiSessionExchangeResult>('/lti/session-exchange', { token });
  return res.data;
}

// ── Deep Linking picker (public, token-scoped, used by /lti/deep-linking) ───

export interface DeepLinkingSimulation {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  maxScore: number;
  launchType: string | null;
}

export interface DeepLinkingContext {
  contextTitle: string | null;
  acceptMultiple: boolean;
  acceptPresentationDocumentTargets: string[];
  simulations: DeepLinkingSimulation[];
}

export interface DeepLinkingSelection {
  simulationId: string;
  title?: string;
  maxScore: number;
  gradingMode: 'score' | 'completion' | 'score_and_completion';
  attemptPolicy: 'best' | 'last' | 'first' | 'average' | 'instructor_selected';
  durationLimit?: number;
  launchBehavior?: 'iframe' | 'window' | 'embed';
}

export async function getDeepLinkingContext(token: string, search?: string): Promise<DeepLinkingContext> {
  const res = await api.get<DeepLinkingContext>('/lti/deep-linking/context', { token, search });
  return res.data;
}

export async function submitDeepLinkingResponse(token: string, selections: DeepLinkingSelection[]): Promise<{ returnUrl: string; jwt: string }> {
  const res = await api.post<{ returnUrl: string; jwt: string }>('/lti/deep-linking/response', { token, selections });
  return res.data;
}

// ── AGS resync + NRPS roster sync (instructor dashboard actions) ────────────

export interface AgsSyncResult {
  id: string;
  agsSyncStatus: 'pending' | 'synced' | 'failed' | null;
  agsLastSyncAt: string | null;
  agsLastError: string | null;
  agsRetryCount: number;
}

export async function resyncAgsScore(scoreId: string): Promise<AgsSyncResult> {
  const res = await api.post<AgsSyncResult>('/lti/ags/sync-score', { scoreId });
  return res.data;
}

export interface NrpsSyncResult {
  totalMembers: number;
  studentsSynced: number;
  instructorsSynced: number;
  syncedAt: string;
}

export async function syncNrpsRoster(courseId: string): Promise<NrpsSyncResult> {
  const res = await api.post<NrpsSyncResult>('/lti/nrps/sync-roster', { courseId });
  return res.data;
}

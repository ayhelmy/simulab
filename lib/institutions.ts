/**
 * Institutions API helpers — SRS §4.4 INST-01 to INST-07; §4.16 SET-01 to SET-05.
 */

import { api } from './api';
import type { Institution, Department, AcademicTerm, Domain } from '@/types';
import type { PaginationMeta } from '@/types/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InstitutionQuery {
  page?:   number;
  limit?:  number;
  search?: string;
  status?: 'active' | 'suspended';
}

export interface CreateInstitutionData {
  name:               string;
  slug?:              string;
  domain?:            string;
  logoUrl?:           string;
  primaryColor?:      string;
  timezone?:          string;
  locale?:            string;
  subscriptionPlan?:  'trial' | 'starter' | 'professional' | 'enterprise';
  maxUsers?:          number;
}

export interface UpdateInstitutionData {
  name?:              string;
  domain?:            string;
  logoUrl?:           string;
  primaryColor?:      string;
  timezone?:          string;
  locale?:            string;
  subscriptionPlan?:  string;
  maxUsers?:          number;
  status?:            'active' | 'suspended';
  settings?:          Record<string, unknown>;
}

export interface InstitutionDetail extends Institution {
  userCount?: number;
  deptCount?: number;
  maxStorageGb?: number;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface InstitutionSettings {
  id:                       string;
  name:                     string;
  slug:                     string;
  domain:                   string | null;
  logoUrl:                  string | null;
  primaryColor:             string;
  timezone:                 string;
  locale:                   string;
  subscriptionPlan:         string;
  maxUsers:                 number;
  status:                   string;
  // Enrollment policy
  enrollmentType:           string;
  enrollmentCap:            number | null;
  requireApproval:          boolean;
  // Key-value settings
  notificationEmailEnabled: boolean;
  notificationPushEnabled:  boolean;
  maxSimAttempts:           number;
  passScore:                number;
  requireEmailVerification: boolean;
  sessionDurationDays:      number;
}

export interface EmailDomain {
  id:            string;
  domain:        string;
  isPrimary:     boolean;
  createdAt:     string;
}

export interface DomainWithGlobal extends Domain {
  isGlobal: boolean;
}

// ── Institution CRUD ──────────────────────────────────────────────────────────

export async function listInstitutions(query?: InstitutionQuery): Promise<{ institutions: InstitutionDetail[]; meta: PaginationMeta }> {
  const res = await api.get<InstitutionDetail[]>('/institutions', query as Record<string, unknown>);
  return { institutions: res.data, meta: res.meta! };
}

export async function getInstitution(id: string): Promise<InstitutionDetail> {
  const res = await api.get<InstitutionDetail>(`/institutions/${id}`);
  return res.data;
}

export async function createInstitution(data: CreateInstitutionData): Promise<InstitutionDetail> {
  const res = await api.post<InstitutionDetail>('/institutions', data);
  return res.data;
}

export async function updateInstitution(id: string, data: UpdateInstitutionData): Promise<InstitutionDetail> {
  const res = await api.patch<InstitutionDetail>(`/institutions/${id}`, data);
  return res.data;
}

export async function deleteInstitution(id: string): Promise<void> {
  await api.delete(`/institutions/${id}`);
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function listDepartments(instId: string): Promise<Department[]> {
  const res = await api.get<Department[]>(`/institutions/${instId}/departments`);
  return res.data;
}

export async function createDepartment(instId: string, data: { name: string; code?: string; parentId?: string }): Promise<Department> {
  const res = await api.post<Department>(`/institutions/${instId}/departments`, data);
  return res.data;
}

export async function updateDepartment(instId: string, deptId: string, data: { name?: string; code?: string; parentId?: string }): Promise<Department> {
  const res = await api.patch<Department>(`/institutions/${instId}/departments/${deptId}`, data);
  return res.data;
}

export async function deleteDepartment(instId: string, deptId: string): Promise<void> {
  await api.delete(`/institutions/${instId}/departments/${deptId}`);
}

// ── Academic Terms ────────────────────────────────────────────────────────────

export async function listTerms(instId: string): Promise<AcademicTerm[]> {
  const res = await api.get<AcademicTerm[]>(`/institutions/${instId}/terms`);
  return res.data;
}

export async function createTerm(instId: string, data: { name: string; startDate: string; endDate: string; isCurrent?: boolean }): Promise<AcademicTerm> {
  const res = await api.post<AcademicTerm>(`/institutions/${instId}/terms`, data);
  return res.data;
}

export async function updateTerm(instId: string, termId: string, data: { name?: string; startDate?: string; endDate?: string; isCurrent?: boolean }): Promise<AcademicTerm> {
  const res = await api.patch<AcademicTerm>(`/institutions/${instId}/terms/${termId}`, data);
  return res.data;
}

export async function deleteTerm(instId: string, termId: string): Promise<void> {
  await api.delete(`/institutions/${instId}/terms/${termId}`);
}

// ── Learning Domains ──────────────────────────────────────────────────────────

export async function listDomains(instId: string): Promise<DomainWithGlobal[]> {
  const res = await api.get<DomainWithGlobal[]>(`/institutions/${instId}/domains`);
  return res.data;
}

export async function createDomain(instId: string, data: { name: string; description?: string; color?: string }): Promise<DomainWithGlobal> {
  const res = await api.post<DomainWithGlobal>(`/institutions/${instId}/domains`, data);
  return res.data;
}

export async function updateDomain(instId: string, domainId: string, data: { name?: string; description?: string; color?: string }): Promise<DomainWithGlobal> {
  const res = await api.patch<DomainWithGlobal>(`/institutions/${instId}/domains/${domainId}`, data);
  return res.data;
}

export async function deleteDomain(instId: string, domainId: string): Promise<void> {
  await api.delete(`/institutions/${instId}/domains/${domainId}`);
}

// ── Email Registration Domains ────────────────────────────────────────────────

export async function listEmailDomains(instId: string): Promise<EmailDomain[]> {
  const res = await api.get<EmailDomain[]>(`/institutions/${instId}/email-domains`);
  return res.data;
}

export async function addEmailDomain(instId: string, data: { domain: string; isPrimary?: boolean }): Promise<EmailDomain> {
  const res = await api.post<EmailDomain>(`/institutions/${instId}/email-domains`, data);
  return res.data;
}

export async function removeEmailDomain(instId: string, domainId: string): Promise<void> {
  await api.delete(`/institutions/${instId}/email-domains/${domainId}`);
}

// ── Institution Settings ──────────────────────────────────────────────────────

export async function getInstitutionSettings(): Promise<InstitutionSettings> {
  const res = await api.get<InstitutionSettings>('/settings/institution');
  return res.data;
}

export async function updateInstitutionSettings(data: Partial<InstitutionSettings>): Promise<InstitutionSettings> {
  const res = await api.patch<InstitutionSettings>('/settings/institution', data);
  return res.data;
}

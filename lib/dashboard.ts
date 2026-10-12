/**
 * Dashboard API helpers — GET /api/v1/dashboard/{me,platform,institution,
 * department,instructor,ta,student}. One shared envelope shape, different
 * kpis/sections payload per role. See types/index.ts DashboardEnvelope<>.
 */

import { api } from './api';
import type {
  DashboardEnvelope, PlatformKpis, PlatformSections,
  InstitutionKpis, InstitutionSections, DepartmentKpis, DepartmentSections,
  TeachingKpis, TeachingSections, StudentKpis, StudentSections,
} from '@/types';

export type PlatformDashboard = DashboardEnvelope<PlatformKpis, PlatformSections>;
export type InstitutionDashboard = DashboardEnvelope<InstitutionKpis, InstitutionSections>;
export type DepartmentDashboard = DashboardEnvelope<DepartmentKpis, DepartmentSections>;
export type TeachingDashboard = DashboardEnvelope<TeachingKpis, TeachingSections>;
export type StudentDashboard = DashboardEnvelope<StudentKpis, StudentSections>;
export type AnyDashboard = DashboardEnvelope;

export async function getMyDashboard(): Promise<AnyDashboard> {
  const res = await api.get<AnyDashboard>('/dashboard/me');
  return res.data;
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  const res = await api.get<PlatformDashboard>('/dashboard/platform');
  return res.data;
}

export async function getInstitutionDashboard(): Promise<InstitutionDashboard> {
  const res = await api.get<InstitutionDashboard>('/dashboard/institution');
  return res.data;
}

export async function getDepartmentDashboard(): Promise<DepartmentDashboard> {
  const res = await api.get<DepartmentDashboard>('/dashboard/department');
  return res.data;
}

export async function getInstructorDashboard(): Promise<TeachingDashboard> {
  const res = await api.get<TeachingDashboard>('/dashboard/instructor');
  return res.data;
}

export async function getTaDashboard(): Promise<TeachingDashboard> {
  const res = await api.get<TeachingDashboard>('/dashboard/ta');
  return res.data;
}

export async function getStudentDashboard(): Promise<StudentDashboard> {
  const res = await api.get<StudentDashboard>('/dashboard/student');
  return res.data;
}

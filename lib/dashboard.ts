import { api } from './api';

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
}

export interface InstructorStats {
  activeCourses: number;
  activeStudents: number;
}

export interface StudentStats {
  enrolledCourses: number;
  completedCourses: number;
}

export type DashboardStats = AdminStats | InstructorStats | StudentStats;

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>('/dashboard/stats');
  return res.data;
}

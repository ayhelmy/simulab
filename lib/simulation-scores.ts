/**
 * Simulation scores API helpers — bridges simulation_activity_sessions to the gradebook.
 */

import { api } from './api';
import type { SimulationScore } from '@/types';

export async function getSimulationScore(courseId: string, id: string): Promise<SimulationScore> {
  const res = await api.get<SimulationScore>(`/courses/${courseId}/simulation-scores/${id}`);
  return res.data;
}

export async function listCourseSimulationScores(courseId: string): Promise<SimulationScore[]> {
  const res = await api.get<SimulationScore[]>(`/courses/${courseId}/simulation-scores`);
  return res.data ?? [];
}

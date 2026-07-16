/**
 * Course Journey API helpers — SRS §4.8 PRG-01; §4.15 CMS.
 * Provides the full course tree with completion status, simulation metadata,
 * and lock states for the student journey page.
 */

import { api } from './api';
import type { CourseJourney } from '@/types';

export async function getCourseJourney(courseId: string): Promise<CourseJourney> {
  const res = await api.get<CourseJourney>(`/courses/${courseId}/journey`);
  return res.data;
}

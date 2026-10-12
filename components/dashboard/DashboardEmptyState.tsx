'use client';

import type { ReactNode } from 'react';
import EmptyState from '@/components/common/EmptyState';

export default function DashboardEmptyState({ description, extra }: { description: string; extra?: ReactNode }) {
  return <EmptyState description={description} extra={extra} />;
}

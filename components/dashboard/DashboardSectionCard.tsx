'use client';

import { Card, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import EmptyState from '@/components/common/EmptyState';

interface Props {
  title: string;
  extra?: ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyDescription?: string;
  children: ReactNode;
  size?: 'small' | 'default';
}

export default function DashboardSectionCard({
  title, extra, loading, isEmpty, emptyDescription = 'Nothing to show yet.', children, size = 'small',
}: Props) {
  return (
    <Card title={title} extra={extra} size={size} style={{ marginBottom: 16 }}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : isEmpty ? (
        <EmptyState description={emptyDescription} />
      ) : (
        children
      )}
    </Card>
  );
}

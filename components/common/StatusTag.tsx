'use client';

import { Tag } from 'antd';

const STATUS_COLOR: Record<string, string> = {
  // Course statuses
  draft:     'gold',
  published: 'green',
  archived:  'default',
  // User statuses
  active:    'green',
  suspended: 'red',
  pending:   'orange',
  // Enrollment statuses
  approved:  'green',
  dropped:   'default',
  completed: 'blue',
  // Simulation
  not_started: 'default',
  in_progress: 'processing',
  passed:      'green',
  failed:      'red',
};

export default function StatusTag({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'default';
  return (
    <Tag color={color} style={{ textTransform: 'capitalize', fontWeight: 500 }}>
      {status.replace(/_/g, ' ')}
    </Tag>
  );
}

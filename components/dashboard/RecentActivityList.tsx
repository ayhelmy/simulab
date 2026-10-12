'use client';

import { Timeline, Typography } from 'antd';
import {
  AuditOutlined, FileTextOutlined, ExperimentOutlined, TrophyOutlined,
} from '@ant-design/icons';
import type { RecentActivityItem } from '@/types';
import EmptyState from '@/components/common/EmptyState';

const { Text } = Typography;

const ICON: Record<RecentActivityItem['type'], React.ReactNode> = {
  audit: <AuditOutlined style={{ color: '#6B7280' }} />,
  quiz_attempt: <FileTextOutlined style={{ color: '#D97706' }} />,
  simulation_session: <ExperimentOutlined style={{ color: '#059669' }} />,
  grade_posted: <TrophyOutlined style={{ color: '#7C3AED' }} />,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function RecentActivityList({ items }: { items: RecentActivityItem[] }) {
  if (!items.length) return <EmptyState description="No recent activity yet." />;

  return (
    <Timeline
      items={items.map((item) => ({
        icon: ICON[item.type],
        content: (
          <div>
            <Text style={{ fontSize: 13 }}>{item.title}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.description} · {timeAgo(item.at)}
            </Text>
          </div>
        ),
      }))}
    />
  );
}

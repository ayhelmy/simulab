'use client';

import { List, Tag } from 'antd';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/common/EmptyState';

export interface FollowUpItem {
  key: string;
  label: string;
  count: number;
  severity?: 'default' | 'warning' | 'error';
  href?: string;
}

const SEVERITY_COLOR: Record<string, string> = { default: 'blue', warning: 'gold', error: 'red' };

export default function FollowUpTasksList({ items }: { items: FollowUpItem[] }) {
  const router = useRouter();
  const visible = items.filter((i) => i.count > 0);

  if (!visible.length) return <EmptyState description="Nothing needs your attention right now." />;

  return (
    <List
      size="small"
      dataSource={visible}
      renderItem={(item) => (
        <List.Item
          style={{ cursor: item.href ? 'pointer' : 'default' }}
          onClick={() => item.href && router.push(item.href)}
        >
          <span>{item.label}</span>
          <Tag color={SEVERITY_COLOR[item.severity ?? 'default']}>{item.count}</Tag>
        </List.Item>
      )}
    />
  );
}

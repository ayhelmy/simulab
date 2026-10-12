'use client';

import { Space, Button } from 'antd';
import { useRouter } from 'next/navigation';
import type { QuickAction } from '@/types';

export default function DashboardQuickActions({ actions }: { actions: QuickAction[] }) {
  const router = useRouter();
  if (!actions.length) return null;

  return (
    <Space wrap>
      {actions.map((action, i) => (
        <Button key={action.href + action.label} type={i === 0 ? 'primary' : 'default'} onClick={() => router.push(action.href)}>
          {action.label}
        </Button>
      ))}
    </Space>
  );
}

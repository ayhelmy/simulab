'use client';

import { Badge, Button, Empty } from 'antd';
import { useRouter } from 'next/navigation';
import DashboardSectionCard from './DashboardSectionCard';

export default function NotificationsSummaryCard({ unread, loading }: { unread: number; loading?: boolean }) {
  const router = useRouter();

  return (
    <DashboardSectionCard
      title="Notifications"
      loading={loading}
      extra={<Badge count={unread} showZero style={{ backgroundColor: unread > 0 ? '#F59324' : '#d9d9d9' }} />}
    >
      {unread > 0 ? (
        <p style={{ margin: 0 }}>You have {unread} unread notification{unread === 1 ? '' : 's'}.</p>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You're all caught up." />
      )}
      <Button type="link" style={{ paddingLeft: 0 }} onClick={() => router.push('/notifications')}>
        View all notifications
      </Button>
    </DashboardSectionCard>
  );
}

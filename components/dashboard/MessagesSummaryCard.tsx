'use client';

import { Badge, Button, Empty } from 'antd';
import { useRouter } from 'next/navigation';
import DashboardSectionCard from './DashboardSectionCard';

export default function MessagesSummaryCard({ unread, loading }: { unread: number; loading?: boolean }) {
  const router = useRouter();

  return (
    <DashboardSectionCard
      title="Messages"
      loading={loading}
      extra={<Badge count={unread} showZero style={{ backgroundColor: unread > 0 ? '#F59324' : '#d9d9d9' }} />}
    >
      {unread > 0 ? (
        <p style={{ margin: 0 }}>You have {unread} unread message{unread === 1 ? '' : 's'}.</p>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No unread messages." />
      )}
      <Button type="link" style={{ paddingLeft: 0 }} onClick={() => router.push('/mail')}>
        Go to Mail
      </Button>
    </DashboardSectionCard>
  );
}

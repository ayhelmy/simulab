'use client';

import { Alert, Button, Space } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Extra actions rendered after Retry. */
  extra?: ReactNode;
}

export default function DashboardErrorState({ title, message, onRetry, extra }: Props) {
  const actions = (onRetry || extra) && (
    <Space wrap>
      {onRetry && <Button size="small" danger onClick={onRetry}>Retry</Button>}
      {extra}
    </Space>
  );
  return (
    <Alert
      type="error"
      showIcon
      message={title ?? "Couldn't load this dashboard"}
      description={message ?? 'Something went wrong while fetching your dashboard data. Please try again.'}
      action={actions}
      style={{ marginBottom: 24 }}
    />
  );
}

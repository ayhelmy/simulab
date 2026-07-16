'use client';

import { Spin, Skeleton } from 'antd';

interface Props {
  type?: 'spin' | 'skeleton';
  rows?: number;
  tip?: string;
}

export default function LoadingState({ type = 'spin', rows = 4, tip }: Props) {
  if (type === 'skeleton') {
    return <Skeleton active paragraph={{ rows }} />;
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0' }}>
      <Spin size="large" description={tip} />
    </div>
  );
}

'use client';

import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  description?: string;
  extra?: ReactNode;
  image?: 'simple' | 'default';
}

export default function EmptyState({
  description = 'No data available.',
  extra,
  image = 'simple',
}: Props) {
  return (
    <Empty
      image={image === 'simple' ? Empty.PRESENTED_IMAGE_SIMPLE : Empty.PRESENTED_IMAGE_DEFAULT}
      description={description}
      style={{ padding: '3rem 0' }}
    >
      {extra}
    </Empty>
  );
}

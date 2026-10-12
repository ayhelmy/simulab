'use client';

import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  /** Optional bold heading shown above the description. */
  title?: string;
  description?: string;
  extra?: ReactNode;
  image?: 'simple' | 'default' | ReactNode;
}

export default function EmptyState({
  title,
  description = 'No data available.',
  extra,
  image = 'simple',
}: Props) {
  const img = image === 'simple' ? Empty.PRESENTED_IMAGE_SIMPLE
    : image === 'default' ? Empty.PRESENTED_IMAGE_DEFAULT
    : image;

  return (
    <Empty
      image={img}
      description={title ? (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{title}</div>
          <div style={{ color: '#6B7280' }}>{description}</div>
        </>
      ) : description}
      style={{ padding: '3rem 0' }}
    >
      {extra}
    </Empty>
  );
}

'use client';

import { Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

interface Props {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}

export default function PageHeader({ title, subtitle, extra }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        {subtitle && (
          <Text type="secondary" style={{ fontSize: 14 }}>{subtitle}</Text>
        )}
      </div>
      {extra && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{extra}</div>}
    </div>
  );
}

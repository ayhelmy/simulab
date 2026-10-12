'use client';

import { Row, Col, Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

export interface DashboardKpiItem {
  key: string;
  label: string;
  value: number | string | null | undefined;
  icon?: ReactNode;
  color?: string;
  suffix?: string;
}

interface Props {
  items: DashboardKpiItem[];
  loading?: boolean;
}

export default function DashboardKpiGrid({ items, loading }: Props) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {items.map((item) => (
        <Col xs={24} sm={12} lg={6} key={item.key}>
          <Card>
            <Statistic
              title={item.label}
              value={item.value ?? '—'}
              suffix={item.suffix}
              prefix={item.icon && <span style={{ color: item.color ?? '#F59324' }}>{item.icon}</span>}
              styles={{ content: { color: item.color ?? undefined } }}
              loading={loading}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

'use client';

import { Row, Col } from 'antd';
import { resolveIcon } from '@/lib/iconMap';
import type { StatCard } from '@/lib/pageContent';

interface Props {
  statistics: StatCard[];
}

export default function PlatformStatistics({ statistics }: Props) {
  if (!statistics.length) return null;

  return (
    <section
      aria-label="Platform statistics"
      style={{ background: '#111827', padding: '32px 24px' }}
    >
      <Row justify="center" gutter={[32, 24]} style={{ maxWidth: 1000, margin: '0 auto' }}>
        {statistics.map((stat) => (
          <Col key={stat.label} xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 6 }}>{resolveIcon(stat.icon, '#F59324', 22)}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                {stat.label}
                {stat.shortDescription ? ` · ${stat.shortDescription}` : ''}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </section>
  );
}

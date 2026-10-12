'use client';

import { Skeleton } from 'antd';
import { colors, cardStyle } from '@/components/home/homeTheme';

export default function SimulationSkeleton() {
  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{ width: '100%', aspectRatio: '16 / 10', background: colors.bgMuted }} aria-hidden="true" />
      <div style={{ padding: '16px 18px 18px' }}>
        <Skeleton active paragraph={{ rows: 3 }} title={{ width: '60%' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 ,justifyContent: 'flex-end'}}>
          <Skeleton.Button active size="small" style={{ width: 130 }} />
          <Skeleton.Button active size="small" style={{ width: 80 }} />
        </div>
      </div>
    </div>
  );
}

/** Renders N skeleton cards in the same grid the real results use. */
export function SimulationSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="sim-results-grid" aria-busy="true" aria-label="Loading simulations">
      {Array.from({ length: count }).map((_, i) => (
        <SimulationSkeleton key={i} />
      ))}
    </div>
  );
}

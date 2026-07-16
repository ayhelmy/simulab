'use client';

import React from 'react';
import { Card, Skeleton } from 'antd';

export default function SimulationSkeleton() {
  return (
    <Card className="sim-result-card" styles={{ body: { padding: 0 } }}>
      <div className="sim-card-inner">
        <div className="sim-card-thumb" style={{ background: '#F3F4F6' }} aria-hidden="true" />
        <div className="sim-card-content">
          <Skeleton active paragraph={{ rows: 3 }} title={{ width: '60%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Skeleton.Button active size="small" style={{ width: 70 }} />
            <Skeleton.Button active size="small" style={{ width: 80 }} />
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Renders N skeleton cards in a list. */
export function SimulationSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="sim-results-list" aria-busy="true" aria-label="Loading simulations">
      {Array.from({ length: count }).map((_, i) => (
        <SimulationSkeleton key={i} />
      ))}
    </div>
  );
}

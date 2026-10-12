'use client';

import { Empty } from 'antd';
import type { Resource } from '@/lib/resources';
import ResourceCard from './ResourceCard';

interface Props {
  resources: Resource[];
}

export default function ResourceGrid({ resources }: Props) {
  if (!resources.length) {
    return <Empty description="No resources match your filters." style={{ padding: '48px 0' }} />;
  }

  return (
    <div className="home-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} />
      ))}
    </div>
  );
}

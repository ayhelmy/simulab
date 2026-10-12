'use client';

import { ClockCircleOutlined, ArrowRightOutlined, FileTextOutlined } from '@ant-design/icons';
import type { Resource } from '@/lib/resources';
import { colors, cardStyle } from '@/components/home/homeTheme';
import PlaceholderPanel from '@/components/home/PlaceholderPanel';

interface Props {
  resource: Resource;
}

export default function ResourceCard({ resource }: Props) {
  return (
    <div style={{ ...cardStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'relative' }}>
        <PlaceholderPanel
          src={resource.image}
          alt={resource.title}
          aspectRatio="16 / 10"
          borderRadius={0}
          icon={<FileTextOutlined style={{ fontSize: 32, color: colors.accent, opacity: 0.5 }} />}
        />
        <span
          style={{
            position: 'absolute', top: 10, left: 10,
            background: colors.primary, color: '#fff', fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.04em', borderRadius: 6, padding: '3px 9px', textTransform: 'uppercase',
          }}
        >
          {resource.category}
        </span>
      </div>

      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: 16.5, fontWeight: 700, color: colors.heading, margin: '0 0 8px' }}>
          {resource.title}
        </h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: colors.body, margin: '0 0 14px', flex: 1 }}>
          {resource.description}
        </p>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.body, marginBottom: 16 }}>
          <ClockCircleOutlined style={{ fontSize: 11 }} /> {resource.duration}
        </span>

        <button
          type="button"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: colors.primary, color: '#fff', border: 'none',
            borderRadius: 10, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%',
          }}
        >
          {resource.actionText} <ArrowRightOutlined />
        </button>
      </div>
    </div>
  );
}

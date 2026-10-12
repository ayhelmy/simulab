'use client';

import { useRouter } from 'next/navigation';
import { ClockCircleOutlined, PlayCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { FeaturedSimulationCard } from '@/lib/pageContent';
import { colors, cardStyle } from './homeTheme';

interface Props {
  sim: FeaturedSimulationCard;
}

export default function FeaturedSimCard({ sim }: Props) {
  const router = useRouter();
  const goToDetail = () => router.push(`/sim/${sim.id}`);
  const meta = [sim.discipline, sim.estimatedMinutes ? `${sim.estimatedMinutes} min` : null].filter(Boolean).join(' · ');
  const isDemo = sim.visibility === 'demo_public' || sim.visibility === 'demo_and_institution';
  const isWebGL = sim.launchType === 'webgl';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => { if (e.key === 'Enter') goToDetail(); }}
      style={{ ...cardStyle, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%',gap:15 }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', background: colors.bgMuted }}>
        {sim.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/admin-provided URL, not a fixed local asset
          <img
            src={sim.thumbnailUrl}
            alt={sim.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExperimentOutlined style={{ fontSize: 36, color: colors.accent, opacity: 0.5 }} />
          </div>
        )}

        {(isDemo || isWebGL) && (
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
            {isDemo && (
              <span style={{
                background:  "#f28b363a", color: colors.primary, fontSize: 10.5, fontWeight: 700,
                border: `1px solid ${colors.primary}`, padding: '3px 8px', borderRadius: 10,
              }}>
                Public Demo
              </span>
            )}
            {isWebGL && (
              <span style={{
                background: "#5e95b24d", color: colors.accent, fontSize: 10.5, fontWeight: 700,
                borderRadius: 10, padding: '3px 8px',border: `1px solid ${colors.accent}`,
              }}>
                WebGL
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1}}>
        {meta && (
          <span style={{ display: 'flex', alignItems: 'center',justifyContent: 'space-between', gap: 5, fontSize: 12, color: colors.accent, fontWeight: 600, marginBottom: 6 }}>
            {sim.discipline}
            {sim.estimatedMinutes ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockCircleOutlined style={{ fontSize: 11, marginLeft: sim.discipline ? 4 : 0 }} />
                {sim.estimatedMinutes} min
              </span>
            ) : null}
          </span>
        )}

        <h3 style={{ fontSize: 17, fontWeight: 700, color: colors.heading, margin: '0 0 6px' }}>
          {sim.title}
        </h3>

        {sim.description && (
          <p style={{
            fontSize: 13.5, color: colors.body, margin: '0 0 16px', flex: 1,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {sim.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center',  marginTop: 'auto' ,justifyContent: 'space-between', gap: 50}}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: colors.primary, color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              width: '40%', flexShrink: 0, justifyContent: 'center',
            }}
          >
            <PlayCircleOutlined /> Preview Simulation
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
            style={{
              background: '#fff', color: colors.heading, border: `1px solid ${colors.border}`,
              borderRadius: 8, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Details ›
          </button>
        </div>
      </div>
    </div>
  );
}

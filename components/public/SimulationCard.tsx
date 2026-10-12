'use client';

import { useRouter } from 'next/navigation';
import { ClockCircleOutlined, PlayCircleOutlined, ExperimentOutlined, LockOutlined } from '@ant-design/icons';
import type { CatalogSimulation } from '@/types';
import { colors, cardStyle, tint } from '@/components/home/homeTheme';

interface Props {
  simulation: CatalogSimulation;
  isAuthenticated: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

export default function SimulationCard({ simulation, isAuthenticated }: Props) {
  const router = useRouter();
  const isDemo = simulation.visibility === 'demo_public' || simulation.visibility === 'demo_and_institution';
  const isWebGL = simulation.launchType === 'webgl' || simulation.buildStatus === 'ready';
  const needsLogin = !isDemo && !isAuthenticated;

  const goToDetail = () => {
    if (!simulation.id) return;
    router.push(`/sim/${simulation.id}`);
  };

  return (
    <div
      role="article"
      aria-label={simulation.title}
      onClick={goToDetail}
      className="sim-result-card"
      style={{ ...cardStyle, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', background: colors.bgMuted, flexShrink: 0 }}>
        {simulation.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/admin-provided URL, not a fixed local asset
          <img
            src={simulation.thumbnailUrl}
            alt={`${simulation.title} preview`}
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
              <span style={{ background: colors.primary, color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>
                Public Demo
              </span>
            )}
            {isWebGL && (
              <span style={{ background: 'rgba(255,255,255,0.92)', color: colors.secondary, fontSize: 10.5, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>
                WebGL
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {simulation.discipline && (
            <span style={{ background: tint(colors.primary, 0.12), color: colors.primary, fontSize: 11.5, fontWeight: 600, borderRadius: 6, padding: '3px 9px' }}>
              {simulation.discipline}
            </span>
          )}
          <span style={{ background: tint(colors.accent, 0.12), color: colors.accent, fontSize: 11.5, fontWeight: 600, borderRadius: 6, padding: '3px 9px' }}>
            {DIFFICULTY_LABEL[simulation.difficulty] ?? simulation.difficulty}
          </span>
          {simulation.estimatedMinutes != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.body, fontSize: 12 }}>
              <ClockCircleOutlined style={{ fontSize: 11 }} /> {simulation.estimatedMinutes} min
            </span>
          )}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: colors.heading, margin: '0 0 6px' }}>
          {simulation.title}
        </h3>

        {simulation.description && (
          <p style={{
            fontSize: 13.5, color: colors.body, margin: '0 0 16px', flex: 1,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {simulation.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', flexWrap: 'wrap'  ,justifyContent: 'space-between'}} onClick={(e) => e.stopPropagation()}>
          {needsLogin ? (
            <button
              type="button"
              onClick={() => {
                if (!simulation.id) return;
                router.push(`/login?next=${encodeURIComponent(`/sim/${simulation.id}`)}`);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: colors.primary, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <LockOutlined /> Login to Access
            </button>
          ) : (
            <button
              type="button"
              onClick={goToDetail}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: colors.primary, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <PlayCircleOutlined /> Preview Simulation
            </button>
          )}
          <button
            type="button"
            onClick={goToDetail}
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

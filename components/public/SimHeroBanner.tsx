'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { SimulationDetail } from '@/types';
import { colors } from '@/components/home/homeTheme';

interface Props {
  simulation: SimulationDetail;
}

export default function SimHeroBanner({ simulation }: Props) {
  const router = useRouter();
  const isDemo = simulation.visibility === 'demo_public' || simulation.visibility === 'demo_and_institution';
  const isWebGL = simulation.launchType === 'webgl' || simulation.buildStatus === 'ready';

  return (
    <section
      aria-label="Simulation hero"
      style={{
        position: 'relative',
        minHeight: 260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'start',
        overflow: 'hidden',
        background: simulation.thumbnailUrl
          ? `center / cover no-repeat url(${simulation.thumbnailUrl}), linear-gradient(135deg, ${colors.secondary} 0%, #1e2f3a 100%)`
          : `linear-gradient(135deg, ${colors.secondary} 0%, #1e2f3a 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,17,23,0.82) 0%, rgba(13,17,23,0.68) 50%, rgba(13,17,23,0.5) 100%)' }}
      />

      <div style={{ position: 'relative', margin: '0 auto',padding: '28px 100px 80px', width: '100%', }}>
        <button
          type="button"
          onClick={() => router.push('/public-catalog')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)',
            fontSize: 13.5, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 18,
          }}
        >
          <ArrowLeftOutlined /> Back to Catalog
        </button>

        {(isDemo || isWebGL) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {isDemo && (
              <span style={{ background: colors.primary, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '4px 12px' }}>
                Public Demo
              </span>
            )}
            {isWebGL && (
              <span style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '4px 12px' }}>
                WebGL
              </span>
            )}
          </div>
        )}

        <h1 style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 800, lineHeight: 1.2, color: '#fff', margin: '0 0 12px', maxWidth: 680 }}>
          {simulation.title}
        </h1>

        {simulation.description && (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', maxWidth: 620, margin: 0 }}>
            {simulation.description}
          </p>
        )}
      </div>
    </section>
  );
}

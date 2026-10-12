'use client';

import { colors } from '@/components/home/homeTheme';

export default function ResourcesHero() {
  return (
    <section
      aria-label="Resources hero"
      style={{
        position: 'relative',
        minHeight: 260,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: `center / cover no-repeat url(/images/herobg.png), linear-gradient(135deg, ${colors.secondary} 0%, #1e2f3a 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,17,23,0.78) 0%, rgba(13,17,23,0.6) 55%, rgba(13,17,23,0.42) 100%)' }}
      />

      <div style={{ position: 'relative', maxWidth: 1160, margin: '0 auto', padding: '32px 24px', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 800, lineHeight: 1.2, color: '#fff', margin: '0 0 14px', maxWidth: 620 }}>
          Resources for BEDO Interactive 3D Simulation
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', maxWidth: 560, margin: 0 }}>
          Guides, tutorials, and support materials to help institutions and learners
          explore browser-based engineering and computer science simulations.
        </p>
      </div>
    </section>
  );
}

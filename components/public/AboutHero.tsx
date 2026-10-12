'use client';

import { colors } from '@/components/home/homeTheme';

export default function AboutHero() {
  return (
    <section
      aria-label="About BEDO hero"
      style={{
        position: 'relative',
        minHeight: 260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'start',
        overflow: 'hidden',
        background: `center / cover no-repeat url(/images/abouthero.png), linear-gradient(135deg, ${colors.secondary} 0%, #1e2f3a 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,17,23,0.78) 0%, rgba(13,17,23,0.6) 55%, rgba(13,17,23,0.42) 100%)' }}
      />

      <div style={{ position: 'relative', padding: '28px 100px 80px', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 800, lineHeight: 1.2, color: '#fff', margin: '0 0 14px', maxWidth: 620 }}>
          About BEDO Interactive 3D Simulation
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', maxWidth: 560, margin: 0 }}>
          A digital simulation experience built on BEDO&apos;s background in engineering
          education and technical training solutions.
        </p>
      </div>
    </section>
  );
}

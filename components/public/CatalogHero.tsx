'use client';

import { colors } from '@/components/home/homeTheme';

export default function CatalogHero() {
  return (
    <section
      aria-label="Simulation catalog hero"
      style={{
        position: 'relative',
        // minHeight: 280,
        display: 'flex',
        // alignItems: 'center',

        overflow: 'hidden',
        background: `center / cover no-repeat url(/images/catalogPagehero.jpg), linear-gradient(135deg, ${colors.secondary} 0%, #1e2f3a 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,17,23,0.72) 0%, rgba(13,17,23,0.55) 45%, rgba(13,17,23,0.35) 100%)' }}
      />

      <div style={{ position: 'relative', margin: '0 auto',padding: '16px 100px 16px 100px',width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 800, lineHeight: 1.2, color: '#fff', margin: '0 0 14px', maxWidth: 620 }}>
          Browse BEDO Interactive 3D Simulations
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)', maxWidth: 560, margin: 0 }}>
          Explore browser-based simulations for engineering and computer science labs.
          Search by topic, discipline, learning objective, or availability.
        </p>
      </div>
    </section>
  );
}

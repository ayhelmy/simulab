'use client';

import { colors, cardStyle, tint, ICON_TILE_COLORS } from '@/components/home/homeTheme';

const STEPS = [
  { label: 'Open the simulation in the browser' },
  { label: 'Interact with the 3D lab model' },
  { label: 'Follow guided steps' },
  { label: 'Observe pressure and flow behavior' },
  { label: 'Preview the lab experience online' },
  {label: 'Learn the concepts and principles' },
];

export default function LearnerSteps() {
  return (
    <section aria-label="What learners can do" style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.heading, margin: '0 0 16px' }}>
        What Learners Can Do?
      </h2>
      <div className="learner-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
        {STEPS.map((step, i) => {
          const lineColor = ICON_TILE_COLORS[i % ICON_TILE_COLORS.length];
          return (
            <div key={step.label} style={{ ...cardStyle, background: colors.bgAlt, padding: '18px 16px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: lineColor ,  display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4}}>
                {String(i + 1).padStart(2, '0')}
              <span style={{ display: 'block', width: '90%', height:1, borderRadius: 2, background: lineColor, margin: '8px 0 10px' }} />
              </span>
              <p style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, color: colors.heading, margin: 0 }}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

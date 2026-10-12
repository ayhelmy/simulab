'use client';

import { colors, cardStyle } from '@/components/home/homeTheme';

interface Props {
  description: string;
}

export default function SimulationOverview({ description }: Props) {
  return (
    <section style={{ ...cardStyle, background: colors.bgAlt, padding: '24px 28px', marginBottom: 24 }} aria-label="About this simulation">
      <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.heading, margin: '0 0 10px' }}>
        About this Simulation
      </h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.7, color: colors.body, margin: 0 }}>
        {description}
      </p>
    </section>
  );
}

'use client';

import { colors, cardStyle } from '@/components/home/homeTheme';

interface Props {
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  accentColor: string;
}

export default function MissionValueCard({ eyebrow, headline, paragraphs, accentColor }: Props) {
  return (
    <div style={{ ...cardStyle, padding: '28px 30px', flex: 1, minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 22, height: 2, borderRadius: 2, background: accentColor }} />
        <span style={{ fontSize:' 24px', fontWeight: 700, color: accentColor, textTransform: 'uppercase' }}>
          {eyebrow}
        </span>
      </span>

      <h3 style={{ fontSize: 17, fontWeight: 700, color: colors.heading, margin: '0 0 12px', lineHeight: 1.4 }}>
        {headline}
      </h3>

      {paragraphs.map((p, i) => (
        <p key={i} style={{ fontSize: 13.5, lineHeight: 1.7, color: colors.body, margin: i === paragraphs.length - 1 ? 0 : '0 0 10px' }}>
          {p}
        </p>
      ))}
    </div>
  );
}

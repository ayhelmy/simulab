'use client';

import type { PlatformStats } from '@/lib/pageContent';
import { colors } from '@/components/home/homeTheme';

interface Props {
  stats: PlatformStats | null;
}

export default function Statistics({ stats }: Props) {
  const items: { value: string; label: string }[] = [
    { value: stats ? `${stats.simulationsCount}+` : '—', label: 'Simulations' },
    { value: stats ? `${stats.institutionsCount}+` : '—', label: 'Institutions' },
    { value: stats ? `${stats.disciplinesCount}+` : '—', label: 'Disciplines' },
    { value: stats ? stats.uptime : '—', label: 'Uptime' },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 24 }}>
      {items.map((item, i) => (
        <div key={item.label}>
          <div style={{ fontSize: 26, fontWeight: 800, color: i%2 === 0 ? colors.accent : colors.primary, lineHeight: 1.2 }}>{item.value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.body, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

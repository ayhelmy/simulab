'use client';

import { CheckCircleFilled } from '@ant-design/icons';
import { colors } from '@/components/home/homeTheme';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  objectives: string[];
}

export default function LearningObjectives({ objectives }: Props) {
  if (!objectives.length) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.heading, margin: '0 0 12px' }}>
        Learning Objectives
      </h3>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {objectives.map((obj, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <CheckCircle2  style={{ color: i%2===0 ? colors.primary : colors.secondary, fontSize: 15, marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, lineHeight: 1.6, color: colors.body }}>{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

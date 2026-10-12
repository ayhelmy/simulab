'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Empty } from 'antd';
import type { ExperimentFunnelStep } from '@/lib/experiments';

interface Props {
  steps: ExperimentFunnelStep[];
  totalAttempts: number;
}

/** Horizontal bar chart: how many attempts completed each step — Recharts equivalent of the FM103 harness's hand-rolled funnel SVG. */
export default function StepFunnelChart({ steps, totalAttempts }: Props) {
  if (steps.length === 0) {
    return <Empty description="No steps reported yet for this experiment." style={{ padding: '24px 0' }} />;
  }

  const data = steps.map((s) => ({
    label: `Step ${s.stepNumber}${s.required ? '' : ' (extra)'}`,
    completed: s.completedCount,
    required: s.required,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, steps.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
        <XAxis type="number" allowDecimals={false} domain={[0, Math.max(totalAttempts, 1)]}
          tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
        <RTooltip
          contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
          formatter={(value: unknown) => [`${value} of ${totalAttempts} attempts`, 'Completed']}
        />
        <Bar dataKey="completed" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.required ? '#7C3AED' : '#CBD5E1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

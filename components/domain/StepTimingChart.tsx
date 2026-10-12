'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { Empty } from 'antd';
import type { ExperimentTimingStep } from '@/lib/experiments';

function formatSeconds(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

/** Vertical bar chart: average StepStarted→StepCompleted duration per step — Recharts equivalent of the FM103 harness's hand-rolled timing SVG. */
export default function StepTimingChart({ steps }: { steps: ExperimentTimingStep[] }) {
  if (steps.length === 0) {
    return <Empty description="No step timings yet — a timing needs a StepStarted and its StepCompleted." style={{ padding: '24px 0' }} />;
  }

  const data = steps.map((s) => ({ label: `Step ${s.stepNumber}`, avg: Math.round(s.avgDurationSeconds * 10) / 10, samples: s.sampleCount }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={formatSeconds} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <RTooltip
          contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
          formatter={(value: unknown, _name: unknown, item?: { payload?: { samples?: number } }) => {
            const samples = item?.payload?.samples ?? 0;
            return [`${formatSeconds(Number(value))} (over ${samples} attempt${samples === 1 ? '' : 's'})`, 'Avg time'];
          }}
        />
        <Bar dataKey="avg" fill="#1677FF" radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

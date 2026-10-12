'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import type { SimulationAnalytics } from '@/lib/simulation-activity';

const formatChartDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function SessionsAreaChart({ data }: { data: SimulationAnalytics['dailyActivity'] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sessions-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="duration-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#1677FF" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#1677FF" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickFormatter={formatChartDate}
          tickLine={false}
          axisLine={false}
        />
        <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} unit="s" />
        <RTooltip
          contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
          labelFormatter={(d: unknown) => formatChartDate(String(d))}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area
          yAxisId="left"
          type="monotone" dataKey="sessions"
          stroke="#7C3AED" strokeWidth={2}
          fill="url(#sessions-fill)"
          dot={{ r: 3, fill: '#7C3AED', strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          name="Sessions"
        />
        <Line
          yAxisId="right"
          type="monotone" dataKey="avgDuration"
          stroke="#1677FF" strokeWidth={2} strokeDasharray="4 2"
          dot={false} activeDot={{ r: 5 }}
          name="Avg Duration (s)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

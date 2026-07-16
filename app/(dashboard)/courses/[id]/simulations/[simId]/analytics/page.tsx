'use client';

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSimulationAnalytics, type SimulationAnalytics } from '@/lib/simulation-activity';
import {
  Row, Col, Card, Statistic, Typography, Tag, Progress, Breadcrumb,
  Spin, Alert, Table, Space, Empty, Tooltip, Badge,
} from 'antd';
import {
  ArrowLeftOutlined, ThunderboltOutlined, TeamOutlined,
  ClockCircleOutlined, AimOutlined, BarChartOutlined,
  CheckCircleOutlined, RiseOutlined, FireOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';

const { Title, Text } = Typography;

// ── Colour palette shared with category colours ───────────────────────────────
const PALETTE = ['#7C3AED','#1677FF','#059669','#F59E0B','#EF4444','#0891B2','#DB2777','#65A30D'];
const colorFor = (i: number) => PALETTE[i % PALETTE.length];

// ── Status badge map ──────────────────────────────────────────────────────────
const STATUS: Record<string, { color: string; label: string }> = {
  ended:     { color: 'success', label: 'Ended' },
  active:    { color: 'processing', label: 'Active' },
  abandoned: { color: 'warning', label: 'Abandoned' },
  expired:   { color: 'error', label: 'Expired' },
};

// ── Click-scatter map ─────────────────────────────────────────────────────────
function ClickMap({
  regions, scatterPoints, referenceImageUrl,
}: {
  regions:           SimulationAnalytics['regions'];
  scatterPoints:     SimulationAnalytics['scatterPoints'];
  referenceImageUrl: string | null;
}) {
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    [...regions, ...scatterPoints.map(p => ({ name: p.category }))].forEach(r => {
      if (!map.has(r.name)) map.set(r.name, colorFor(idx++));
    });
    return map;
  }, [regions, scatterPoints]);

  return (
    <div>
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '56.25%',
        borderRadius: 8, overflow: 'hidden',
        background: referenceImageUrl ? 'transparent' : '#1E293B',
      }}>
        {/* Reference screenshot as background */}
        {referenceImageUrl && (
          <img
            src={referenceImageUrl}
            alt="simulation canvas"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
          />
        )}

        {/* Region bounding boxes */}
        {regions.map((r, i) => (
          <Tooltip key={i} title={r.name}>
            <div style={{
              position: 'absolute',
              left: `${r.normX * 100}%`, top: `${r.normY * 100}%`,
              width: `${r.normW * 100}%`, height: `${r.normH * 100}%`,
              border: `2px solid ${colorMap.get(r.name) ?? '#fff'}`,
              borderRadius: 3,
              background: `${colorMap.get(r.name) ?? '#fff'}30`,
              cursor: 'default',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: 3,
                fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                color: referenceImageUrl ? '#fff' : (colorMap.get(r.name) ?? '#fff'),
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>{r.name}</span>
            </div>
          </Tooltip>
        ))}

        {/* Click scatter dots */}
        {scatterPoints.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${p.normX * 100}%`, top: `${p.normY * 100}%`,
            width: 7, height: 7, borderRadius: '50%',
            background: colorMap.get(p.category) ?? '#7C3AED',
            opacity: 0.75,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />
        ))}
      </div>

      {/* Legend */}
      {scatterPoints.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10 }}>
          {[...colorMap.entries()].map(([name, color]) => (
            <Space key={name} size={5}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <Text style={{ fontSize: 11, color: '#64748B' }}>{name}</Text>
            </Space>
          ))}
        </div>
      )}
      {scatterPoints.length === 0 && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          No interaction data yet.
        </Text>
      )}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, icon, color, suffix,
}: {
  title: string; value: string | number; icon: React.ReactNode;
  color: string; suffix?: string;
}) {
  return (
    <Card
      size="small"
      style={{ borderRadius: 10, borderLeft: `4px solid ${color}`, height: '100%' }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color,
        }}>
          {icon}
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.3 }}>{title}</Text>
          <Text strong style={{ fontSize: 22, lineHeight: 1.4, color: '#0F172A' }}>
            {value}{suffix && <Text style={{ fontSize: 14, color: '#64748B', marginLeft: 4 }}>{suffix}</Text>}
          </Text>
        </div>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
interface Props { params: Promise<{ id: string; simId: string }> }

export default function SimulationAnalyticsPage({ params }: Props) {
  const { id: courseId, simId } = use(params);
  const { user } = useAuth();

  const [data,    setData]    = useState<SimulationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getSimulationAnalytics(courseId, simId)
      .then(setData)
      .catch((err: unknown) => {
        const e = err as { detail?: string; title?: string };
        setError(e.detail ?? e.title ?? 'Failed to load analytics.');
      })
      .finally(() => setLoading(false));
  }, [courseId, simId, user]);

  // ── Component table columns ───────────────────────────────────────────────
  const componentCols: ColumnsType<SimulationAnalytics['componentStats'][number]> = [
    {
      title: '#', dataIndex: 'rank', width: 44,
      render: (r: number, _, i) => (
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: colorFor(i), color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>{r}</div>
      ),
    },
    {
      title: 'Component', dataIndex: 'category',
      render: (v: string, _, i) => <Tag color={colorFor(i)} style={{ fontWeight: 600 }}>{v}</Tag>,
    },
    {
      title: 'Interactions', dataIndex: 'interactions', width: 110,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#0F172A' }}>{v.toLocaleString()}</Text>,
      sorter: (a, b) => a.interactions - b.interactions,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Share', dataIndex: 'percentage', width: 170,
      render: (v: number, _, i) => (
        <Space size={6}>
          <Progress
            percent={v} size="small" showInfo={false}
            strokeColor={colorFor(i)} style={{ width: 100 }}
          />
          <Text style={{ fontSize: 12, color: colorFor(i), fontWeight: 600 }}>{v}%</Text>
        </Space>
      ),
    },
  ];

  // ── Recent sessions table columns ─────────────────────────────────────────
  type Session = SimulationAnalytics['recentSessions'][number];
  const sessionCols: ColumnsType<Session> = [
    {
      title: 'Student', dataIndex: 'studentName',
      render: (name: string, row: Session) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
          {row.studentEmail && (
            <div><Text type="secondary" style={{ fontSize: 11 }}>{row.studentEmail}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', width: 100,
      render: (s: string) => (
        <Badge status={(STATUS[s]?.color ?? 'default') as 'success' | 'processing' | 'warning' | 'error' | 'default'}
               text={STATUS[s]?.label ?? s} />
      ),
    },
    {
      title: 'Duration', dataIndex: 'formattedDuration', width: 90,
      align: 'right' as const,
      render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'Interactions', dataIndex: 'clicks', width: 110,
      align: 'right' as const,
      render: (v: number) => <Text strong style={{ color: '#7C3AED' }}>{v}</Text>,
    },
    {
      title: 'First Click', dataIndex: 'firstClickDelay', width: 100,
      align: 'right' as const,
      render: (v: number | null) => v != null
        ? <Text type="secondary" style={{ fontSize: 12 }}>{v}s in</Text>
        : <Text type="secondary">—</Text>,
    },
  ];

  const { summary } = data ?? {};

  // ── Chart tooltip formatter ───────────────────────────────────────────────
  const formatChartDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px 40px' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link href="/courses">Courses</Link> },
        { title: <Link href={`/courses/${courseId}/activity`}>Activity</Link> },
        { title: 'Simulation Analytics' },
      ]} />

      {/* Header */}
      <Space align="center" style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Title level={3} style={{ margin: 0, color: '#0F172A' }}>
            <BarChartOutlined style={{ marginRight: 10, color: '#7C3AED' }} />
            Simulation Analytics
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Aggregated across all student sessions for this simulation
          </Text>
        </div>
        <Link href={`/courses/${courseId}/activity`}>
          <Space style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: '#fff', cursor: 'pointer', fontSize: 13, color: '#475569',
          }}>
            <ArrowLeftOutlined /> Back to Activity
          </Space>
        </Link>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 20 }} />}

      <Spin spinning={loading}>
        {/* ── KPI cards ───────────────────────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Total Sessions"   value={summary?.totalSessions   ?? 0} icon={<ThunderboltOutlined />} color="#7C3AED" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Unique Students"  value={summary?.uniqueStudents   ?? 0} icon={<TeamOutlined />}         color="#1677FF" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Interactions"     value={summary?.totalClicks      ?? 0} icon={<AimOutlined />}          color="#059669" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Avg Duration"     value={summary?.formattedAvgDuration ?? '—'} icon={<ClockCircleOutlined />} color="#F59E0B" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Clicks / Session" value={summary?.avgClicksPerSession ?? 0} icon={<FireOutlined />} color="#EF4444" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KpiCard title="Completion Rate"  value={summary?.completionRate ?? 0} suffix="%" icon={<CheckCircleOutlined />} color="#0891B2" />
          </Col>
        </Row>

        {/* ── Click map + Component table ──────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} md={11}>
            <Card
              title={<Space><AimOutlined style={{ color: '#7C3AED' }} />Click Map</Space>}
              size="small" style={{ borderRadius: 10, height: '100%' }}
              extra={
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {data?.scatterPoints.length ?? 0} points plotted
                </Text>
              }
            >
              {data && (
                <ClickMap
                  regions={data.regions}
                  scatterPoints={data.scatterPoints}
                  referenceImageUrl={data.referenceImageUrl}
                />
              )}
              {data && data.scatterPoints.length === 0 && data.regions.length === 0 && (
                <Empty description="Upload click regions via the Simulation Catalog to enable this map." style={{ padding: '24px 0' }} />
              )}
            </Card>
          </Col>

          <Col xs={24} md={13}>
            <Card
              title={<Space><RiseOutlined style={{ color: '#7C3AED' }} />Component Interactions</Space>}
              size="small" style={{ borderRadius: 10, height: '100%' }}
              extra={
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {summary?.componentsReached ?? 0} components reached
                </Text>
              }
            >
              {data && data.componentStats.length === 0 ? (
                <Empty description="No categorized interactions yet." style={{ padding: '24px 0' }} />
              ) : (
                <Table
                  dataSource={data?.componentStats ?? []}
                  columns={componentCols}
                  rowKey="category"
                  size="small"
                  pagination={false}
                  style={{ fontSize: 13 }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* ── Sessions over time (Recharts area chart) ─────────────────────── */}
        <Card
          title={<Space><BarChartOutlined style={{ color: '#7C3AED' }} />Sessions Over Time (last 30 days)</Space>}
          size="small"
          style={{ borderRadius: 10, marginBottom: 20 }}
        >
          {data && data.dailyActivity.length === 0 ? (
            <Empty description="No sessions in the last 30 days." style={{ padding: '32px 0' }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.dailyActivity ?? []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
          )}
        </Card>

        {/* ── Recent sessions ───────────────────────────────────────────────── */}
        <Card
          title={<Space><TeamOutlined style={{ color: '#7C3AED' }} />Recent Sessions</Space>}
          size="small"
          style={{ borderRadius: 10 }}
          extra={
            <Link href={`/courses/${courseId}/activity`} style={{ fontSize: 12, color: '#7C3AED' }}>
              View all →
            </Link>
          }
        >
          {data && data.recentSessions.length === 0 ? (
            <Empty description="No sessions yet." style={{ padding: '24px 0' }} />
          ) : (
            <Table<Session>
              dataSource={data?.recentSessions ?? []}
              columns={sessionCols}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 560 }}
            />
          )}
        </Card>
      </Spin>
    </div>
  );
}

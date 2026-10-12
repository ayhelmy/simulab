'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { getExperimentDashboard, type ExperimentDashboardResponse } from '@/lib/experiments';
import {
  Row, Col, Card, Typography, Breadcrumb, Select,
  Spin, Alert, Table, Space, Empty, Collapse,
} from 'antd';
import {
  ArrowLeftOutlined, ExperimentOutlined, TeamOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ThunderboltOutlined, FireOutlined,
} from '@ant-design/icons';
import StudentExperimentCard from '@/components/domain/StudentExperimentCard';

// Recharts is a sizable dependency used only on this one page — split it into
// its own chunk instead of bundling it with the page's initial JS.
const StepFunnelChart = dynamic(() => import('@/components/domain/StepFunnelChart'), {
  ssr: false,
  loading: () => <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>,
});
const StepTimingChart = dynamic(() => import('@/components/domain/StepTimingChart'), {
  ssr: false,
  loading: () => <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>,
});

const { Title, Text } = Typography;

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '–';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
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
          <Text strong style={{ fontSize: 22, lineHeight: 1.4, color: '#111827' }}>
            {value}{suffix && <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>{suffix}</Text>}
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

  const [data,          setData]          = useState<ExperimentDashboardResponse | null>(null);
  const [experimentId,  setExperimentId]  = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getExperimentDashboard(courseId, simId, experimentId ? { experimentId } : undefined)
      .then((res) => {
        setData(res);
        if (!experimentId && res.selectedExperimentId) setExperimentId(res.selectedExperimentId);
      })
      .catch((err: unknown) => {
        const e = err as { detail?: string; title?: string };
        setError(e.detail ?? e.title ?? 'Failed to load the experiment dashboard.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, simId, user, experimentId]);

  const overview = data?.overview;
  const answered = (overview?.correct ?? 0) + (overview?.incorrect ?? 0);
  const answerPct = answered ? Math.round((100 * (overview?.correct ?? 0)) / answered) : null;

  const stepTableCols = [
    { title: 'Step', dataIndex: 'stepNumber', key: 'stepNumber' },
    { title: 'Required', dataIndex: 'required', key: 'required', render: (v: boolean) => (v ? 'yes' : 'no') },
    {
      title: 'Reached', key: 'reached', align: 'right' as const,
      render: (_: unknown, row: { stepNumber: number }) =>
        data?.funnel.find((f) => f.stepNumber === row.stepNumber)?.reachedCount ?? 0,
    },
    {
      title: 'Completed', key: 'completed', align: 'right' as const,
      render: (_: unknown, row: { stepNumber: number }) =>
        data?.funnel.find((f) => f.stepNumber === row.stepNumber)?.completedCount ?? 0,
    },
    {
      title: 'Avg time', key: 'avg', align: 'right' as const,
      render: (_: unknown, row: { stepNumber: number }) => {
        const t = data?.timing.find((x) => x.stepNumber === row.stepNumber);
        return t ? formatDuration(t.avgDurationSeconds) : '–';
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px 40px' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link href="/courses">Courses</Link> },
        { title: <Link href={`/courses/${courseId}/activity`}>Activity</Link> },
        { title: 'Experiment Dashboard' },
      ]} />

      {/* Header */}
      <Space align="center" style={{ marginBottom: 24, width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>
            <ExperimentOutlined style={{ marginRight: 10, color: '#5C98B7' }} />
            Experiment Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Structured step/question tracking for this simulation, across the course
          </Text>
        </div>
        <Space wrap>
          <Select
            value={experimentId ?? undefined}
            placeholder="Select an experiment"
            style={{ minWidth: 220 }}
            options={data?.experiments.map((e) => ({ value: e.experimentId, label: e.title ? `${e.experimentId} — ${e.title}` : e.experimentId }))}
            onChange={setExperimentId}
            loading={loading && !data}
          />
          <Link href={`/courses/${courseId}/activity`}>
            <Space style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
              background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151',
            }}>
              <ArrowLeftOutlined /> Back to Activity
            </Space>
          </Link>
        </Space>
      </Space>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 20 }} />}

      <Spin spinning={loading}>
        {data && data.experiments.length === 0 ? (
          <Empty
            description="No structured tracking data yet — this simulation hasn't reported any experiment events for this course."
            style={{ padding: '48px 0' }}
          />
        ) : (
          <>
            {/* ── KPI tiles ─────────────────────────────────────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={12} sm={8} md={4}>
                <KpiCard title="Step Completion" value={overview?.stepPercentage ?? 0} suffix="%" icon={<CheckCircleOutlined />} color="#F59324" />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <KpiCard title="Attempts Completed" value={`${overview?.completedCount ?? 0}/${overview?.attemptCount ?? 0}`} icon={<ThunderboltOutlined />} color="#5C98B7" />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <KpiCard title="Students Attempted" value={overview?.studentCount ?? 0} icon={<TeamOutlined />} color="#059669" />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <KpiCard title="Answers Correct" value={`${overview?.correct ?? 0}/${answered}`} suffix={answerPct != null ? `${answerPct}%` : undefined} icon={<FireOutlined />} color="#D97706" />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <KpiCard title="Median Run Time" value={formatDuration(overview?.medianDurationSeconds ?? null)} icon={<ClockCircleOutlined />} color="#2F5A70" />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <KpiCard title="Events Stored" value={overview?.eventCount ?? 0} icon={<ExperimentOutlined />} color="#5C98B7" />
              </Col>
            </Row>

            {/* ── Funnel + timing charts ────────────────────────────────────── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
              <Col xs={24} md={12}>
                <Card title="Attempts completing each step" size="small" style={{ borderRadius: 10, height: '100%' }}>
                  <StepFunnelChart steps={data?.funnel ?? []} totalAttempts={overview?.attemptCount ?? 0} />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Average time on each step" size="small" style={{ borderRadius: 10, height: '100%' }}>
                  <StepTimingChart steps={data?.timing ?? []} />
                </Card>
              </Col>
            </Row>

            {(data?.funnel.length ?? 0) > 0 && (
              <Collapse
                style={{ marginBottom: 20 }}
                items={[{
                  key: 'table',
                  label: 'Show data table',
                  children: <Table dataSource={data?.funnel} columns={stepTableCols} rowKey="stepNumber" size="small" pagination={false} />,
                }]}
              />
            )}

            {/* ── Per-student cards ─────────────────────────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Students</Title>
            {data && data.students.length === 0 ? (
              <Empty description="No enrolled students yet." style={{ padding: '24px 0' }} />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {data?.students.map((student) => (
                  <StudentExperimentCard key={student.studentId} student={student} />
                ))}
              </Space>
            )}
          </>
        )}
      </Spin>
    </div>
  );
}

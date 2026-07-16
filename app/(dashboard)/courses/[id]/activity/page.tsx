'use client';

/**
 * Course Simulation Activity — Instructor/Admin view.
 * Route: /courses/:id/activity
 *
 * Shows all simulation activity sessions for the course with:
 *  - Summary statistics header (total launches, unique students, total/avg duration)
 *  - Filterable table (student, lesson, simulation, status, date range)
 *  - Pagination
 *
 * Access: instructor (own courses), dept_manager, institution_admin, super_admin.
 */

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  listCourseSimulationActivity,
  getSessionClickEvents,
  type ActivityListQuery,
  type ClickEventRow,
} from '@/lib/simulation-activity';
import { getCourse } from '@/lib/courses';
import type {
  InstructorActivitySession,
  CourseActivitySummary,
  Course,
} from '@/types';
import type { PaginationMeta } from '@/types/api';
import {
  Table, Card, Row, Col, Statistic, Button, Space, Typography, Tag, Alert,
  Spin, Select, DatePicker, Breadcrumb, Empty, Tooltip, Modal, Avatar,
} from 'antd';
import {
  ArrowLeftOutlined, ReloadOutlined,
  ClockCircleOutlined, TeamOutlined, ThunderboltOutlined, BarChartOutlined,
  AimOutlined, ClusterOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker }  = DatePicker;

interface Props { params: Promise<{ id: string }> }

const STATUS_COLORS: Record<string, string> = {
  ended:     'green',
  active:    'blue',
  abandoned: 'orange',
  expired:   'red',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function StudentName({ row }: { row: InstructorActivitySession }) {
  const name = [row.userFirstName, row.userLastName].filter(Boolean).join(' ');
  return (
    <div>
      <Text strong style={{ fontSize: 13 }}>{name || 'Unknown'}</Text>
      {row.userEmail && (
        <div><Text type="secondary" style={{ fontSize: 11 }}>{row.userEmail}</Text></div>
      )}
    </div>
  );
}

// ── Click Events modal ────────────────────────────────────────────────────────
// Shows every individual click in sequence order with its component name and
// coordinates. Uncategorized clicks (outside all annotated regions) are hidden.

const CATEGORY_COLORS = ['#7C3AED', '#1677FF', '#059669', '#F59E0B', '#EF4444', '#0891B2', '#DB2777', '#65A30D'];

function ClickStatsModal({
  session,
  onClose,
}: {
  session: InstructorActivitySession;
  onClose: () => void;
}) {
  const [events,  setEvents]  = useState<ClickEventRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSessionClickEvents(session.id)
      .then(res => {
        if (cancelled) return;
        setEvents(res.events);
        setTotal(res.totalClicks);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const e = err as { detail?: string; title?: string };
        setError(e.detail ?? e.title ?? 'Failed to load click events.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session.id]);

  // assign a stable color to each unique category name
  const categoryColor = useMemo(() => {
    const map = new Map<string, string>();
    const seen: string[] = [];
    events.forEach(e => {
      if (!map.has(e.category)) {
        map.set(e.category, CATEGORY_COLORS[seen.length % CATEGORY_COLORS.length]);
        seen.push(e.category);
      }
    });
    return map;
  }, [events]);

  const studentName = [session.userFirstName, session.userLastName].filter(Boolean).join(' ') || 'Unknown';

  const columns: ColumnsType<ClickEventRow> = [
    {
      title:     '#',
      dataIndex: 'sequenceNo',
      width:     48,
      render:    (n: number) => (
        <Avatar size={22} style={{ background: '#F1F5F9', color: '#475569', fontSize: 11 }}>{n}</Avatar>
      ),
    },
    {
      title:  'Time',
      dataIndex: 'time',
      width:  90,
      render: (t: string) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#94A3B8', fontSize: 11 }} />
          <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{t}</Text>
        </Space>
      ),
    },
    {
      title:  'Component',
      dataIndex: 'category',
      render: (cat: string) => (
        <Tag color={categoryColor.get(cat)} style={{ fontSize: 12 }}>{cat}</Tag>
      ),
    },
  ];

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={680}
      title={
        <Space>
          <ClusterOutlined style={{ color: '#7C3AED' }} />
          Component Interactions
        </Space>
      }
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        {studentName} · {session.lessonTitle ?? 'Lesson'} · {session.simulationTitle ?? 'Simulation'}
      </Text>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      <Spin spinning={loading}>
        {!loading && events.length === 0 ? (
          <Empty
            description="No component interactions recorded for this session."
            style={{ padding: '32px 0' }}
          />
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <AimOutlined style={{ color: '#7C3AED', marginRight: 6 }} />
                {total} interaction{total === 1 ? '' : 's'} · ordered by sequence
              </Text>
            </div>
            <Table<ClickEventRow>
              dataSource={events}
              columns={columns}
              rowKey="sequenceNo"
              size="small"
              pagination={events.length > 50 ? { pageSize: 50, showSizeChanger: false } : false}
              scroll={{ y: 400 }}
            />
          </>
        )}
      </Spin>
    </Modal>
  );
}


export default function CourseActivityPage({ params }: Props) {
  const { id: courseId } = use(params);
  const { user }         = useAuth();

  const [course,   setCourse]   = useState<Course | null>(null);
  const [sessions, setSessions] = useState<InstructorActivitySession[]>([]);
  const [summary,  setSummary]  = useState<CourseActivitySummary | null>(null);
  const [meta,     setMeta]     = useState<PaginationMeta | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Filters
  const [filterStatus,    setFilterStatus]    = useState<string | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null);
  const [currentPage,     setCurrentPage]     = useState(1);
  const pageSize = 20;

  const [statsTarget, setStatsTarget] = useState<InstructorActivitySession | null>(null);

  const columns: ColumnsType<InstructorActivitySession> = useMemo(() => [
    {
      title:     'Student',
      key:       'student',
      width:     170,
      render:    (_: unknown, row: InstructorActivitySession) => <StudentName row={row} />,
    },
    {
      title:     'Lesson',
      key:       'lesson',
      ellipsis:  true,
      render:    (_: unknown, row: InstructorActivitySession) => (
        <Tooltip title={`Module: ${row.moduleTitle ?? '—'}`}>
          <Text style={{ fontSize: 13 }}>{row.lessonTitle ?? '—'}</Text>
        </Tooltip>
      ),
    },
    {
      title:    'Simulation',
      key:      'simulation',
      ellipsis: true,
      render:   (_: unknown, row: InstructorActivitySession) =>
        row.simulationId ? (
          <Tooltip title="View simulation analytics">
            <Link
              href={`/courses/${courseId}/simulations/${row.simulationId}/analytics`}
              style={{ fontSize: 13, color: '#7C3AED' }}
            >
              {row.simulationTitle ?? '—'}
            </Link>
          </Tooltip>
        ) : (
          <Text style={{ fontSize: 13 }}>{row.simulationTitle ?? '—'}</Text>
        ),
    },
    {
      title:     'Started',
      dataIndex: 'startedAt',
      key:       'startedAt',
      width:     155,
      sorter:    true,
      render:    (v: string) => <Text style={{ fontSize: 12 }}>{formatDate(v)}</Text>,
    },
    {
      title:     'Ended',
      dataIndex: 'endedAt',
      key:       'endedAt',
      width:     155,
      render:    (v: string | null) => (
        <Text style={{ fontSize: 12 }}>{v ? formatDate(v) : <Text type="secondary">—</Text>}</Text>
      ),
    },
    {
      title:     'Duration',
      key:       'duration',
      width:     100,
      align:     'right' as const,
      render:    (_: unknown, row: InstructorActivitySession) => (
        <Text strong style={{ fontSize: 13 }}>
          {row.durationSeconds > 0 ? row.formattedDuration : <Text type="secondary">—</Text>}
        </Text>
      ),
    },
    {
      title:  'Status',
      key:    'status',
      width:  100,
      render: (_: unknown, row: InstructorActivitySession) => (
        <Tag color={STATUS_COLORS[row.status] ?? 'default'} style={{ fontSize: 11 }}>
          {row.status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title:  'Steps',
      key:    'stepsStatus',
      width:  100,
      align:  'center' as const,
      render: (_: unknown, row: InstructorActivitySession) => {
        if (row.stepsStatus === 'passed') {
          return (
            <Tooltip title="All steps completed in sequence">
              <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11 }}>
                Passed
              </Tag>
            </Tooltip>
          );
        }
        if (row.stepsStatus === 'failed') {
          return (
            <Tooltip title="Steps not completed in sequence">
              <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 11 }}>
                Failed
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="No steps defined for this simulation">
            <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
          </Tooltip>
        );
      },
    },
    {
      title:  'Interactions',
      key:    'interactions',
      width:  130,
      align:  'center' as const,
      render: (_: unknown, row: InstructorActivitySession) => (
        <Tooltip title="View component interaction summary">
          <Button
            size="small"
            icon={<AimOutlined />}
            onClick={() => setStatsTarget(row)}
          >
            View Stats
          </Button>
        </Tooltip>
      ),
    },
  ], []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const q: ActivityListQuery = {
        page:  currentPage,
        limit: pageSize,
        ...(filterStatus    ? { status:    filterStatus }    : {}),
        ...(filterDateRange ? { date_from: filterDateRange[0], date_to: filterDateRange[1] } : {}),
      };
      const [courseData, activityData] = await Promise.all([
        course ? Promise.resolve(course) : getCourse(courseId),
        listCourseSimulationActivity(courseId, q),
      ]);
      setCourse(courseData);
      setSessions(activityData.sessions);
      setSummary(activityData.summary);
      setMeta(activityData.meta);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to load activity data.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user, currentPage, filterStatus, filterDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReset = () => {
    setFilterStatus(undefined);
    setFilterDateRange(null);
    setCurrentPage(1);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link href="/courses">Courses</Link> },
          { title: <Link href={`/courses/${courseId}`}>{course?.title ?? 'Course'}</Link> },
          { title: 'Simulation Activity' },
        ]}
      />

      {/* Header */}
      <Space align="start" style={{ marginBottom: 20, width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8, color: '#7C3AED' }} />
            Simulation Activity
          </Title>
          {course && (
            <Text type="secondary" style={{ fontSize: 13 }}>{course.title}</Text>
          )}
        </div>
        <Space>
          <Link href={`/courses/${courseId}`}>
            <Button icon={<ArrowLeftOutlined />}>Back to Course</Button>
          </Link>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Refresh
          </Button>
        </Space>
      </Space>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={loadData}>Retry</Button>} />
      )}

      {/* Summary statistics */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title="Total Launches"
                value={summary.totalLaunches}
                prefix={<ThunderboltOutlined style={{ color: '#7C3AED' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title="Unique Students"
                value={summary.uniqueStudents}
                prefix={<TeamOutlined style={{ color: '#1677FF' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title="Total Duration"
                value={summary.formattedTotalDuration}
                prefix={<ClockCircleOutlined style={{ color: '#059669' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
              <Statistic
                title="Avg Duration"
                value={summary.formattedAvgDuration}
                prefix={<ClockCircleOutlined style={{ color: '#F59E0B' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Space wrap size={12}>
          <Select
            placeholder="Filter by status"
            allowClear
            value={filterStatus}
            onChange={v => { setFilterStatus(v); setCurrentPage(1); }}
            style={{ width: 160 }}
            options={[
              { value: 'active',    label: 'Active' },
              { value: 'ended',     label: 'Ended' },
              { value: 'abandoned', label: 'Abandoned' },
              { value: 'expired',   label: 'Expired' },
            ]}
          />
          <RangePicker
            showTime={false}
            format="YYYY-MM-DD"
            onChange={(_dates, strings) => {
              if (strings[0] && strings[1]) {
                setFilterDateRange([strings[0], strings[1]]);
              } else {
                setFilterDateRange(null);
              }
              setCurrentPage(1);
            }}
          />
          <Button onClick={handleReset}>Reset Filters</Button>
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 8 }}>
        <Spin spinning={loading}>
          {!loading && sessions.length === 0 ? (
            <Empty
              description="No simulation activity found for this course."
              style={{ padding: '40px 0' }}
            />
          ) : (
            <Table<InstructorActivitySession>
              dataSource={sessions}
              columns={columns}
              rowKey="id"
              size="small"
              scroll={{ x: 900 }}
              pagination={{
                current:   currentPage,
                pageSize,
                total:     meta?.total ?? 0,
                showTotal: (total) => `${total} sessions`,
                onChange:  (page) => setCurrentPage(page),
                showSizeChanger: false,
              }}
            />
          )}
        </Spin>
      </Card>

      {statsTarget && (
        <ClickStatsModal
          session={statsTarget}
          onClose={() => setStatsTarget(null)}
        />
      )}
    </div>
  );
}

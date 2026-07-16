'use client';

/**
 * My Simulation Activity — student self-service view.
 * Route: /simulation-activity
 *
 * Students see only their own sessions. Shows course, lesson, simulation,
 * start/end time, duration, and status for each session.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  listMySimulationActivity,
  type ActivityListQuery,
} from '@/lib/simulation-activity';
import type { SimulationActivitySession } from '@/types';
import type { PaginationMeta } from '@/types/api';
import {
  Table, Card, Button, Space, Typography, Tag, Alert,
  Spin, Select, DatePicker, Empty, Breadcrumb, Tooltip,
} from 'antd';
import {
  ReloadOutlined, ClockCircleOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

const COLUMNS: ColumnsType<SimulationActivitySession> = [
  {
    title:    'Course',
    key:      'course',
    ellipsis: true,
    render:   (_, row) => (
      row.courseId ? (
        <Link href={`/courses/${row.courseId}/home`}>
          <Text style={{ fontSize: 13 }}>{row.courseTitle ?? row.courseId}</Text>
        </Link>
      ) : <Text type="secondary">—</Text>
    ),
  },
  {
    title:    'Lesson',
    key:      'lesson',
    ellipsis: true,
    render:   (_, row) => (
      <Tooltip title={`Module: ${row.moduleTitle ?? '—'}`}>
        <Text style={{ fontSize: 13 }}>{row.lessonTitle ?? '—'}</Text>
      </Tooltip>
    ),
  },
  {
    title:    'Simulation',
    key:      'simulation',
    ellipsis: true,
    render:   (_, row) => (
      <Space size={4}>
        <ExperimentOutlined style={{ color: '#7C3AED', fontSize: 12 }} />
        <Text style={{ fontSize: 13 }}>{row.simulationTitle ?? '—'}</Text>
      </Space>
    ),
  },
  {
    title:  'Started',
    key:    'startedAt',
    width:  155,
    sorter: true,
    render: (_, row) => <Text style={{ fontSize: 12 }}>{formatDate(row.startedAt)}</Text>,
  },
  {
    title:  'Ended',
    key:    'endedAt',
    width:  155,
    render: (_, row) => <Text style={{ fontSize: 12 }}>{formatDate(row.endedAt)}</Text>,
  },
  {
    title:  'Duration',
    key:    'duration',
    width:  100,
    align:  'right',
    render: (_, row) => (
      <Space size={4}>
        <ClockCircleOutlined style={{ color: '#6B7280', fontSize: 11 }} />
        <Text strong style={{ fontSize: 13 }}>
          {row.durationSeconds > 0 ? row.formattedDuration : <Text type="secondary">—</Text>}
        </Text>
      </Space>
    ),
  },
  {
    title:  'Status',
    key:    'status',
    width:  100,
    render: (_, row) => (
      <Tag color={STATUS_COLORS[row.status] ?? 'default'} style={{ fontSize: 11 }}>
        {row.status.toUpperCase()}
      </Tag>
    ),
  },
];

export default function MySimulationActivityPage() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState<SimulationActivitySession[]>([]);
  const [meta,     setMeta]     = useState<PaginationMeta | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [filterStatus,    setFilterStatus]    = useState<string | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null);
  const [currentPage,     setCurrentPage]     = useState(1);
  const pageSize = 20;

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
      const { sessions: rows, meta: m } = await listMySimulationActivity(q);
      setSessions(rows);
      setMeta(m);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to load activity.');
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, filterStatus, filterDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReset = () => {
    setFilterStatus(undefined);
    setFilterDateRange(null);
    setCurrentPage(1);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px' }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link href="/dashboard">Dashboard</Link> },
          { title: 'My Simulation Activity' },
        ]}
      />

      <Space align="start" style={{ marginBottom: 20, width: '100%', justifyContent: 'space-between' }} wrap>
        <Title level={4} style={{ margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#7C3AED' }} />
          My Simulation Activity
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Refresh
        </Button>
      </Space>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={loadData}>Retry</Button>} />
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
          <Button onClick={handleReset}>Reset</Button>
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 8 }}>
        <Spin spinning={loading}>
          {!loading && sessions.length === 0 ? (
            <Empty
              description="No simulation sessions yet. Start a simulation from a course lesson."
              style={{ padding: '40px 0' }}
            >
              <Link href="/courses">
                <Button type="primary">Browse Courses</Button>
              </Link>
            </Empty>
          ) : (
            <Table<SimulationActivitySession>
              dataSource={sessions}
              columns={COLUMNS}
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
    </div>
  );
}

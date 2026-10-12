'use client';

/**
 * Instructor LTI course report — reached when an instructor launches a
 * simulation activity from their LMS (see app/lti/launching/page.tsx, which
 * redirects instructor/TA roles here instead of the simulation player).
 *
 * Route: /instructor/lti/course/:courseId/report
 *
 * This is a thin wrapper over EXISTING endpoints — no new backend reporting
 * system. Session/activity data comes from the same
 * listCourseSimulationActivity + listCourseSimulationScores calls the native
 * (non-LTI) course gradebook/activity pages already use; only the NRPS
 * roster-sync and AGS resync actions are LTI-specific.
 */

import { useState, useEffect, useCallback, use } from 'react';
import {
  Card, Table, Tag, Statistic, Row, Col, Button, Empty, Spin, Alert, App, Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  ReloadOutlined, TeamOutlined, ClockCircleOutlined, ExperimentOutlined, SyncOutlined,
} from '@ant-design/icons';
import { listCourseSimulationActivity } from '@/lib/simulation-activity';
import { listCourseSimulationScores } from '@/lib/simulation-scores';
import { syncNrpsRoster, resyncAgsScore } from '@/lib/lti';
import { useAuth } from '@/context/AuthContext';
import type { InstructorActivitySession, CourseActivitySummary, SimulationScore } from '@/types';

interface Props { params: Promise<{ courseId: string }> }

interface ReportRow {
  key: string;
  userId: string;
  studentName: string;
  studentEmail: string | null;
  lessonTitle: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  formattedDuration: string;
  score: SimulationScore | null;
}

function errMsg(err: unknown, fallback: string): string {
  const e = err as { title?: string; detail?: string };
  return e.detail ?? e.title ?? fallback;
}

export default function InstructorLtiReportPage({ params }: Props) {
  const { courseId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { message } = App.useApp();

  const [sessions, setSessions] = useState<InstructorActivitySession[]>([]);
  const [summary, setSummary] = useState<CourseActivitySummary | null>(null);
  const [scores, setScores] = useState<SimulationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [activity, scoreRows] = await Promise.all([
        listCourseSimulationActivity(courseId, { limit: 200 }),
        listCourseSimulationScores(courseId),
      ]);
      setSessions(activity.sessions);
      setSummary(activity.summary);
      setScores(scoreRows);
    } catch (err: unknown) {
      setError(errMsg(err, 'Failed to load course report'));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { if (user) load(); }, [user, load]);

  async function handleSyncRoster() {
    setSyncingRoster(true);
    try {
      const result = await syncNrpsRoster(courseId);
      message.success(`Roster synced — ${result.totalMembers} member(s) (${result.studentsSynced} students, ${result.instructorsSynced} instructors)`);
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Roster sync is not available for this course.'));
    } finally {
      setSyncingRoster(false);
    }
  }

  async function handleResync(scoreId: string) {
    setResyncingId(scoreId);
    try {
      const result = await resyncAgsScore(scoreId);
      message.success(`Grade sync: ${result.agsSyncStatus}`);
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to resync grade.'));
    } finally {
      setResyncingId(null);
    }
  }

  // ── Merge activity sessions + scores into one row per (user, lesson) ──
  const rows: ReportRow[] = sessions.map((s) => {
    const score = scores.find((sc) => sc.userId === s.userId && sc.lessonId === s.lessonId) ?? null;
    return {
      key: s.id,
      userId: s.userId,
      studentName: `${s.userFirstName ?? ''} ${s.userLastName ?? ''}`.trim() || 'Unknown',
      studentEmail: s.userEmail,
      lessonTitle: s.lessonTitle,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      formattedDuration: s.formattedDuration,
      score,
    };
  });

  const columns: TableColumnsType<ReportRow> = [
    { title: 'Student', key: 'student', render: (_, r) => <span>{r.studentName}{r.studentEmail && <div style={{ fontSize: 11, color: '#888' }}>{r.studentEmail}</div>}</span> },
    { title: 'Activity', dataIndex: 'lessonTitle', key: 'lessonTitle' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'ended' ? 'green' : s === 'active' ? 'processing' : 'default'}>{s}</Tag> },
    { title: 'Duration', dataIndex: 'formattedDuration', key: 'duration' },
    { title: 'Started', dataIndex: 'startedAt', key: 'startedAt', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: 'Score', key: 'score',
      render: (_, r) => r.score ? <span>{r.score.rawScore}/{r.score.pointsPossible}</span> : <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Grade Sync', key: 'gradeSync',
      render: (_, r) => {
        if (!r.score) return '—';
        return (
          <Tooltip title="Resync this grade to the LMS gradebook">
            <Button
              size="small" icon={<SyncOutlined />} loading={resyncingId === r.score.id}
              onClick={() => r.score && handleResync(r.score.id)}
            >
              Resync
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  if (authLoading || (loading && !error)) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col><h2 style={{ margin: 0 }}>Course Activity Report</h2></Col>
        <Col>
          <Button icon={<TeamOutlined />} loading={syncingRoster} onClick={handleSyncRoster} style={{ marginRight: 8 }}>
            Sync Roster
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        </Col>
      </Row>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="Total Launches" value={summary.totalLaunches} prefix={<ExperimentOutlined />} /></Card></Col>
          <Col span={6}><Card><Statistic title="Unique Students" value={summary.uniqueStudents} prefix={<TeamOutlined />} /></Card></Col>
          <Col span={6}><Card><Statistic title="Total Time" value={summary.formattedTotalDuration} prefix={<ClockCircleOutlined />} /></Card></Col>
          <Col span={6}><Card><Statistic title="Avg. Time" value={summary.formattedAvgDuration} prefix={<ClockCircleOutlined />} /></Card></Col>
        </Row>
      )}

      <Card>
        {rows.length === 0 && !loading
          ? <Empty description="No simulation activity yet." />
          : <Table dataSource={rows} columns={columns} rowKey="key" loading={loading} scroll={{ x: 900 }} />}
      </Card>
    </div>
  );
}

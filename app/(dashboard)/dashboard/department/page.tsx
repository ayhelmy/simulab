'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRoleRouteGuard } from '@/hooks/useRoleRouteGuard';
import { getDepartmentDashboard, type DepartmentDashboard } from '@/lib/dashboard';
import DashboardHeader, { scopeToContext } from '@/components/dashboard/DashboardHeader';
import DashboardKpiGrid, { type DashboardKpiItem } from '@/components/dashboard/DashboardKpiGrid';
import DashboardSectionCard from '@/components/dashboard/DashboardSectionCard';
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions';
import RecentActivityList from '@/components/dashboard/RecentActivityList';
import NotificationsSummaryCard from '@/components/dashboard/NotificationsSummaryCard';
import MessagesSummaryCard from '@/components/dashboard/MessagesSummaryCard';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';
import { Row, Col, Table, Tag, Card, Statistic } from 'antd';
import { TeamOutlined, BookOutlined, ExperimentOutlined, FileTextOutlined } from '@ant-design/icons';

export default function DepartmentDashboardPage() {
  const allowed = useRoleRouteGuard('dept_manager');
  const { user } = useAuth();
  const [data, setData] = useState<DepartmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getDepartmentDashboard()
      .then(setData)
      .catch(() => setError('Failed to load the department dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;
  if (loading && !data) return <DashboardSkeleton />;
  if (error) return <DashboardErrorState message={error} onRetry={load} />;
  if (!data || !user) return null;

  const { kpis, sections } = data;

  const kpiItems: DashboardKpiItem[] = [
    { key: 'users', label: 'Department Users', value: kpis.departmentUsers, icon: <TeamOutlined />, color: '#F59324' },
    { key: 'students', label: 'Students', value: kpis.students, icon: <TeamOutlined />, color: '#059669' },
    { key: 'instructors', label: 'Instructors', value: kpis.instructors, icon: <TeamOutlined />, color: '#D97706' },
    { key: 'terms', label: 'Active Semester Terms', value: kpis.activeSemesterTerms, icon: <BookOutlined />, color: '#7C3AED' },
    { key: 'published', label: 'Published Courses', value: kpis.publishedCourses, icon: <BookOutlined />, color: '#059669' },
    { key: 'lessons', label: 'Total Lessons', value: kpis.totalLessons, icon: <FileTextOutlined />, color: '#D97706' },
    { key: 'quizzes', label: 'Total Quizzes', value: kpis.totalQuizzes, icon: <FileTextOutlined />, color: '#D97706' },
    { key: 'sims', label: 'Simulations Used', value: kpis.totalSimulationsUsed, icon: <ExperimentOutlined />, color: '#7C3AED' },
    {
      key: 'progress', label: 'Avg. Course Progress',
      value: kpis.averageCourseProgress != null ? Math.round(kpis.averageCourseProgress) : '—',
      suffix: kpis.averageCourseProgress != null ? '%' : undefined, color: '#059669',
    },
    { key: 'pending', label: 'Pending Manual Grading', value: kpis.pendingManualGrading, icon: <FileTextOutlined />, color: kpis.pendingManualGrading > 0 ? '#DC2626' : '#059669' },
  ];

  return (
    <div>
      <DashboardHeader name={user.firstName} role="dept_manager" subtitle="Department-level follow-up" {...scopeToContext(data.scope)} />
      <DashboardKpiGrid items={kpiItems} />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <DashboardSectionCard title="Department Courses" isEmpty={!sections.departmentCourses.length}>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={sections.departmentCourses}
              columns={[
                { title: 'Course', dataIndex: 'title' },
                { title: 'Instructor', dataIndex: 'instructorName', render: (v: string | null) => v ?? '—' },
                { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'published' ? 'green' : 'gold'}>{s}</Tag> },
                { title: 'Enrolled', dataIndex: 'enrolledCount' },
                { title: 'Modules', dataIndex: 'moduleCount' },
              ]}
            />
          </DashboardSectionCard>

          {sections.progressFollowUp && (
            <DashboardSectionCard title="Progress Follow-up">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Avg. Course Progress"
                    value={sections.progressFollowUp.averageCourseProgress != null ? Math.round(sections.progressFollowUp.averageCourseProgress) : '—'}
                    suffix={sections.progressFollowUp.averageCourseProgress != null ? '%' : undefined}
                  />
                </Col>
                <Col span={8}><Statistic title="Simulation Launches" value={sections.progressFollowUp.simulationActivity.totalLaunches} /></Col>
                <Col span={8}><Statistic title="Pending Manual Grading" value={sections.progressFollowUp.pendingManualGrading} /></Col>
              </Row>
            </DashboardSectionCard>
          )}

          {/* <DashboardSectionCard title="Recent Activity" isEmpty={!data.recent_activity.length}>
            <RecentActivityList items={data.recent_activity} />
          </DashboardSectionCard> */}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Quick Actions" size="small" style={{ marginBottom: 16 }}>
            <DashboardQuickActions actions={data.quick_actions} />
          </Card>
          <NotificationsSummaryCard unread={data.notifications.unread} />
          <MessagesSummaryCard unread={data.messages.unread} />
        </Col>
      </Row>
    </div>
  );
}

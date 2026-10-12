'use client';

/**
 * Shared view for the instructor and teaching_assistant dashboards — both
 * consume the same TeachingDashboard envelope shape (see lib/dashboard.ts /
 * teaching-dashboard.shared.js on the backend). Only the role label and the
 * page-level route guard differ between the two entry pages.
 *
 * Layout: header with the main work actions · compact stats · Needs Attention ·
 * My Courses (Manage / Preview) · gradebook summary · right rail.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types';
import type { TeachingDashboard } from '@/lib/dashboard';
import DashboardHeader, { scopeToContext } from './DashboardHeader';
import DashboardSectionCard from './DashboardSectionCard';
import DashboardQuickActions from './DashboardQuickActions';
import NotificationsSummaryCard from './NotificationsSummaryCard';
import MessagesSummaryCard from './MessagesSummaryCard';
import { Row, Col, Table, Card, Button } from 'antd';
import {
  BookOutlined, TeamOutlined, FileTextOutlined, ExperimentOutlined, LineChartOutlined,
  CheckSquareOutlined, AppstoreOutlined, MailOutlined, BellOutlined, WarningOutlined,
  EyeOutlined, SettingOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import styles from '@/components/layout/BedoAppSkin.module.css';
import { Chip, learningStyles as s, type ChipTone } from '@/components/student/studentUi';

const COURSE_STATUS_TONE: Record<string, ChipTone> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
};

function CourseStatusChip({ status }: { status: string }) {
  return (
    <Chip tone={COURSE_STATUS_TONE[status] ?? 'neutral'} style={{ textTransform: 'capitalize' }}>
      {status.replace(/_/g, ' ')}
    </Chip>
  );
}

interface AttentionItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  count: number;
  /** Word after the count in the status chip ("3 pending", "2 unread"). */
  unit?: string;
  tone: ChipTone;
  href: string;
  action: string;
}

export default function TeachingDashboardView({ data, firstName, role }: { data: TeachingDashboard; firstName: string; role: UserRole }) {
  const router = useRouter();
  const { kpis, sections } = data;
  const isInstructor = role === 'instructor';
  const firstCourse = sections.myCourses[0];

  const pendingGrading = kpis.pendingQuizGrading + kpis.pendingSimulationGrading;

  const stats = [
    { key: 'courses', label: isInstructor ? 'Active Courses' : 'Assigned Courses', value: kpis.myCourses, icon: <BookOutlined />, color: '#F59324' },
    { key: 'published', label: 'Published Courses', value: kpis.publishedCourses, icon: <CheckCircleFilled />, color: '#059669' },
    { key: 'students', label: 'Enrolled Students', value: kpis.totalEnrolledStudents, icon: <TeamOutlined />, color: '#5C98B7' },
    { key: 'grading', label: 'Pending Grading', value: pendingGrading, icon: <CheckSquareOutlined />, color: pendingGrading > 0 ? '#DC2626' : '#059669' },
    { key: 'sessions', label: 'Active Simulation Sessions', value: kpis.activeSimulationSessions, icon: <ExperimentOutlined />, color: '#5C98B7' },
    {
      key: 'progress', label: 'Avg. Course Progress',
      value: kpis.averageCourseProgress != null ? Math.round(kpis.averageCourseProgress) : '—',
      unit: kpis.averageCourseProgress != null ? '%' : undefined, icon: <LineChartOutlined />, color: '#059669',
    },
  ];

  // Everything that needs the instructor, in priority order. Zero counts are kept
  // (shown as "All clear") so the list has a stable shape.
  const attentionCourses = sections.followUpRequired.perCourse
    .filter((c) => c.studentsWithoutAttempts > 0 || c.studentsWithoutActivity > 0);
  const attention: AttentionItem[] = [
    {
      key: 'quiz', icon: <FileTextOutlined />, label: 'Quizzes pending grading',
      detail: 'Submitted attempts with questions that need a manual score.',
      count: sections.followUpRequired.pendingQuizGrading, tone: 'error', href: '/gradebook', action: 'Grade',
    },
    {
      key: 'sim', icon: <ExperimentOutlined />, label: 'Simulations pending manual review',
      detail: 'Simulation results waiting for your review before they count.',
      count: sections.followUpRequired.pendingSimulationGrading, tone: 'error', href: '/gradebook', action: 'Review',
    },
    ...attentionCourses.map((c) => ({
      key: `course-${c.courseId}`, icon: <WarningOutlined />, label: `${c.title} — missing student activity`,
      detail: `${c.studentsWithoutAttempts} without quiz attempts · ${c.studentsWithoutActivity} without simulation activity`,
      count: c.studentsWithoutAttempts + c.studentsWithoutActivity, unit: 'to follow up', tone: 'warning' as ChipTone,
      href: `/courses/${c.courseId}/activity`, action: 'Simulation Activity',
    })),
    ...(sections.followUpRequired.draftCoursesNotPublished.length > 0 ? [{
      key: 'drafts', icon: <BookOutlined />, label: 'Draft courses not published',
      detail: sections.followUpRequired.draftCoursesNotPublished.map((c) => c.title).join(' · '),
      count: sections.followUpRequired.draftCoursesNotPublished.length, unit: 'draft', tone: 'warning' as ChipTone,
      href: sections.followUpRequired.draftCoursesNotPublished.length === 1
        ? `/courses/${sections.followUpRequired.draftCoursesNotPublished[0].id}` : '/courses',
      action: 'Manage',
    }] : []),
    ...(sections.followUpRequired.coursesWithoutModules.length > 0 ? [{
      key: 'nomodules', icon: <AppstoreOutlined />, label: 'Courses without modules',
      detail: sections.followUpRequired.coursesWithoutModules.map((c) => c.title).join(' · '),
      count: sections.followUpRequired.coursesWithoutModules.length, unit: 'empty', tone: 'warning' as ChipTone,
      href: sections.followUpRequired.coursesWithoutModules.length === 1
        ? `/courses/${sections.followUpRequired.coursesWithoutModules[0].id}/edit?tab=builder` : '/courses',
      action: 'Edit Course',
    }] : []),
    {
      key: 'mail', icon: <MailOutlined />, label: 'Unread messages',
      detail: 'Messages from students and colleagues.',
      count: data.messages.unread, unit: 'unread', tone: 'info', href: '/mail', action: 'Open Messages',
    },
    {
      key: 'notif', icon: <BellOutlined />, label: 'Unread notifications',
      detail: 'Course, enrollment and grading updates.',
      count: data.notifications.unread, unit: 'unread', tone: 'info', href: '/notifications', action: 'View',
    },
  ];

  const quickActions = [
    { label: isInstructor ? 'My Courses' : 'Assigned Courses', href: '/courses' },
    { label: 'Grade Submissions', href: '/gradebook' },
    { label: 'Simulation Activity', href: firstCourse ? `/courses/${firstCourse.id}/activity` : '/courses' },
    { label: 'Messages', href: '/mail' },
  ];

  const missingGrades = sections.gradebookSummary.missingGrades;

  return (
    <div className={`${styles.root} ${s.page}`}>
      <section className={styles.header} data-role={role}>
        <span className={styles.eyebrow}>BEDO Interactive 3D Simulation</span>
        <DashboardHeader
          name={firstName}
          role={role}
          subtitle={isInstructor
            ? 'Manage your simulation courses, review submissions, and monitor student activity.'
            : 'Support your assigned courses: review submissions and monitor student activity.'}
          {...scopeToContext(data.scope)}
        />
        <div className={s.teachActions}>
          <Button type="primary" icon={<CheckSquareOutlined />} onClick={() => router.push('/gradebook')}>
            Grade Submissions{pendingGrading > 0 ? ` (${pendingGrading})` : ''}
          </Button>
          <Button icon={<SettingOutlined />} onClick={() => router.push('/courses')}>
            {isInstructor ? 'Manage Courses' : 'View Courses'}
          </Button>
        </div>
      </section>

      {/* Compact stats — support the page, don't lead it */}
      <div className={`${s.panel} ${s.statStrip}`} role="list" aria-label="Teaching overview">
        {stats.map((st) => (
          <div key={st.key} className={s.stat} role="listitem">
            <span className={s.statIcon} style={{ color: st.color }} aria-hidden>{st.icon}</span>
            <div style={{ minWidth: 0 }}>
              <span className={s.statValue}>
                {st.value ?? '—'}{st.unit && <span className={s.statUnit}>{st.unit}</span>}
              </span>
              <span className={s.statLabel}>{st.label}</span>
            </div>
          </div>
        ))}
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Needs attention */}
          <section className={s.panel} style={{ marginBottom: 16 }} aria-labelledby="needs-attention">
            <div className={s.sectionHead}>
              <div>
                <h3 className={s.sectionTitle} id="needs-attention">Needs Attention</h3>
                <span className={s.sectionHelper}>Your instructor to-do, most urgent first</span>
              </div>
            </div>
            <ul className={s.list}>
              {attention.map((a) => (
                <li key={a.key} className={`${s.todoRow} ${a.count === 0 ? s.todoClear : ''}`}>
                  <span className={s.todoIcon} aria-hidden>{a.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <p className={s.rowTitle}>{a.label}</p>
                    <div className={s.metaRow} style={{ marginTop: 4 }}>
                      {a.count > 0
                        ? <Chip tone={a.tone}>{a.count} {a.unit ?? 'pending'}</Chip>
                        : <Chip tone="success" icon={<CheckCircleFilled />}>All clear</Chip>}
                      {a.detail && <span className={s.meta}>{a.detail}</span>}
                    </div>
                  </div>
                  {a.count > 0 && (
                    <Link href={a.href}><Button size="small">{a.action}</Button></Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* My courses — actionable */}
          <DashboardSectionCard title={isInstructor ? 'My Courses' : 'Assigned Courses'} isEmpty={!sections.myCourses.length}>
            <div className={`${styles.flushTable} ${styles.desktopOnly}`}>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={sections.myCourses}
                scroll={{ x: 680 }}
                columns={[
                  {
                    title: 'Course', dataIndex: 'title',
                    render: (v: string, c) => <Link href={`/courses/${c.id}`} className={styles.rowTitle}>{v}</Link>,
                  },
                  { title: 'Term', dataIndex: 'semesterTermName', render: (v: string | null) => v ? <span style={{ whiteSpace: 'nowrap' }}>{v}</span> : <span className={styles.muted}>—</span> },
                  { title: 'Status', dataIndex: 'status', render: (st: string) => <CourseStatusChip status={st} /> },
                  { title: 'Enrolled Students', dataIndex: 'enrolledCount', align: 'right', render: (v: number) => <span className={styles.numeric}>{v}</span> },
                  { title: 'Modules', dataIndex: 'moduleCount', align: 'right', render: (v: number) => <span className={styles.numeric}>{v}</span> },
                  {
                    title: '', key: 'actions', align: 'right', width: 190,
                    render: (_: unknown, c) => (
                      <div className={s.rowActions}>
                        <Link href={`/courses/${c.id}/home`}><Button size="small" type="text" icon={<EyeOutlined />}>Preview</Button></Link>
                        <Link href={`/courses/${c.id}`}><Button size="small" icon={<SettingOutlined />}>Manage</Button></Link>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
            <ul className={styles.mobileList}>
              {sections.myCourses.map((c) => (
                <li key={c.id} className={styles.mobileItem}>
                  <div className={styles.mobileItemHead}>
                    <span className={styles.rowTitle}>{c.title}</span>
                    <CourseStatusChip status={c.status} />
                  </div>
                  <div className={styles.meta}>
                    {c.semesterTermName ?? '—'} · {c.enrolledCount} enrolled · {c.moduleCount} modules
                  </div>
                  <div className={s.rowActions} style={{ marginTop: 8, justifyContent: 'flex-start' }}>
                    <Link href={`/courses/${c.id}`}><Button size="small" icon={<SettingOutlined />}>Manage</Button></Link>
                    <Link href={`/courses/${c.id}/home`}><Button size="small" type="text" icon={<EyeOutlined />}>Preview</Button></Link>
                  </div>
                </li>
              ))}
            </ul>
          </DashboardSectionCard>

          <DashboardSectionCard title="Gradebook Summary" isEmpty={!sections.gradebookSummary.perCourse.length}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Avg. course progress</span>
                  <span className={styles.statValue}>
                    {sections.gradebookSummary.averageCourseProgress != null ? `${Math.round(sections.gradebookSummary.averageCourseProgress)}%` : '—'}
                  </span>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div className={styles.statTile}>
                  <span className={styles.statLabel}>Missing grades</span>
                  <span className={styles.statValue} style={missingGrades > 0 ? { color: '#D97706' } : undefined}>
                    {missingGrades}
                  </span>
                </div>
              </Col>
            </Row>
          </DashboardSectionCard>
{/*
          <DashboardSectionCard title="Recent Student Activity" isEmpty={!data.recent_activity.length}>
            <RecentActivityList items={data.recent_activity} />
          </DashboardSectionCard> */}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Quick Actions" size="small" className={styles.quickActions} style={{ marginBottom: 16 }}>
            <DashboardQuickActions actions={quickActions} />
          </Card>
          <NotificationsSummaryCard unread={data.notifications.unread} />
          <MessagesSummaryCard unread={data.messages.unread} />
        </Col>
      </Row>
    </div>
  );
}

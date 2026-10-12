'use client';

/**
 * Institution Admin dashboard — an academic operations workspace.
 * Reading order: compact institution summary + main actions · follow-up strip
 * (only what needs action) · four grouped metrics · operations (academic
 * structure, course follow-up, simulation catalogs) with one connected rail
 * (quick actions, notifications, messages). Data: GET /dashboard/institution
 * (unchanged).
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRoleRouteGuard } from '@/hooks/useRoleRouteGuard';
import { getInstitutionDashboard, type InstitutionDashboard } from '@/lib/dashboard';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import { Row, Col, Table, Button } from 'antd';
import {
  TeamOutlined, BookOutlined, ApartmentOutlined, AppstoreAddOutlined, SettingOutlined,
  UserOutlined, BellOutlined, MailOutlined, ArrowRightOutlined, CheckCircleFilled,
  WarningOutlined, FileTextOutlined, UserSwitchOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { Chip, type ChipTone } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminCard, MetricGroup, StatusChip,
  StateBlock, LoadErrorCard,
} from '@/components/admin/adminUi';

interface FollowUp {
  key: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  count: number;
  unit: string;
  tone: Extract<ChipTone, 'error' | 'warning' | 'info'>;
  href: string;
  action: string;
}

interface CatalogRow { id?: string; name: string; itemCount?: number }

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());

export default function InstitutionDashboardPage() {
  const allowed = useRoleRouteGuard('institution_admin');
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<InstitutionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getInstitutionDashboard()
      .then(setData)
      .catch(() => setError('Failed to load the institution dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;
  if (loading && !data) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className={ADMIN_PAGE_CLASS}>
        <LoadErrorCard
          title="Could not load the institution dashboard"
          text="Institution metrics and follow-up items could not be loaded. Check the connection or try again."
          onRetry={load}
        />
      </div>
    );
  }
  if (!data || !user) return null;

  const { kpis, sections, scope } = data;
  const missingAssignment = sections.usersFollowUp.usersMissingAcademicAssignment;
  const noManager = sections.usersFollowUp.departmentsWithoutManager;
  const noManagerIds = new Set(noManager.map((d) => d.id));
  const noModules = sections.coursesFollowUp.coursesWithoutModules;
  const draftCount = sections.coursesFollowUp.draftCourses;
  const catalogs = (sections.simulationCatalogs.catalogs as CatalogRow[]) ?? [];
  const catalogItems = catalogs.reduce((n, c) => n + (c.itemCount ?? 0), 0);
  // The institution's own page holds departments and managers.
  const institutionHref = scope.institution_id ? `/institutions/${scope.institution_id}` : '/institutions';

  // Only what needs action; zero counts drop out of the strip.
  const followUps: FollowUp[] = ([
    {
      key: 'missing', icon: <UserSwitchOutlined />, title: 'Users missing academic assignment',
      text: 'Students and instructors without a department, year, or term.',
      count: missingAssignment.length, unit: 'users', tone: 'warning', href: '/users', action: 'Review Users',
    },
    {
      key: 'noManager', icon: <ApartmentOutlined />, title: 'Departments without a manager',
      text: noManager.map((d) => d.name).join(', ') || 'Every department needs a manager.',
      count: noManager.length, unit: noManager.length === 1 ? 'department' : 'departments', tone: 'warning',
      href: institutionHref, action: 'Assign Manager',
    },
    {
      key: 'tasks', icon: <FileTextOutlined />, title: 'Pending user tasks',
      text: 'User requests and setup tasks waiting for an administrator.',
      count: kpis.pendingUserTasks, unit: 'pending', tone: 'error', href: '/users', action: 'Review Tasks',
    },
    {
      key: 'drafts', icon: <BookOutlined />, title: 'Draft courses',
      text: 'Not yet published, so students cannot see them.',
      count: draftCount, unit: 'draft', tone: 'info', href: '/courses', action: 'Review Courses',
    },
  ] as FollowUp[]).filter((f) => f.count > 0);

  const courseIssues = noModules.length + draftCount;

  return (
    <div className={ADMIN_PAGE_CLASS}>
      {/* A. Compact institution summary */}
      <header className={a.summary}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div className={a.titleRow}>
            <h1 className={a.title}>Welcome back, {user.firstName}</h1>
            <Chip tone="info">Institution Admin</Chip>
          </div>
          {(scope.institution_name || scope.academic_year_name || scope.semester_term_name) && (
            <p className={a.contextLine}>
              {scope.institution_name && <span>{scope.institution_name}</span>}
              {scope.academic_year_name && <span>{scope.academic_year_name}</span>}
              {scope.semester_term_name && <span>{scope.semester_term_name}</span>}
            </p>
          )}
          <p className={a.subtitle}>Manage your institution’s courses, users, academic structure, and simulation catalogs.</p>
        </div>
        <div className={a.headerActions}>
          <Button type="primary" icon={<TeamOutlined />} onClick={() => router.push('/users')}>Manage Users</Button>
          <Button icon={<BookOutlined />} onClick={() => router.push('/courses')}>Manage Courses</Button>
          <Button icon={<SettingOutlined />} onClick={() => router.push('/settings')}>Institution Settings</Button>
        </div>
      </header>

      {/* B. Follow-up strip */}
      <AdminCard
        id="follow-up"
        title="Follow-up"
        icon={<WarningOutlined />}
        extra={followUps.length > 0
          ? <Chip tone="warning">{followUps.length} item{followUps.length === 1 ? '' : 's'} to review</Chip>
          : <Chip tone="success" icon={<CheckCircleFilled />}>All caught up</Chip>}
        flush
      >
        {followUps.length === 0 ? (
          <div className={a.cardBody}>
            <span className={a.healthLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleFilled style={{ color: '#059669' }} /> All caught up. Users, departments, and courses are set up.
            </span>
          </div>
        ) : (
          <ul className={a.alerts}>
            {followUps.map((f) => (
              <li key={f.key} className={a.alert} data-tone={f.tone}>
                <div className={a.alertHead}>
                  {f.icon}
                  <p className={a.alertTitle}>{f.title}</p>
                </div>
                <p className={a.alertText}>{f.text}</p>
                <div className={a.alertFoot}>
                  <Chip tone={f.tone}>{fmt(f.count)} {f.unit}</Chip>
                  <Link href={f.href} className={a.alertAction}>{f.action} <ArrowRightOutlined /></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {/* C. Key metrics — one balanced row */}
      <div className={a.sectionLabel}><h2>Institution Overview</h2></div>
      <div className={a.metricGroups}>
        <MetricGroup
          title="Academic Structure" icon={<ApartmentOutlined />}
          lead={fmt(kpis.departmentsCount)} leadLabel="Departments"
          rows={[
            { label: 'Academic years', value: fmt(kpis.academicYearsCount) },
            { label: 'Semester terms', value: fmt(kpis.semesterTermsCount) },
          ]}
        />
        <MetricGroup
          title="People" icon={<TeamOutlined />}
          lead={fmt(kpis.totalUsers)} leadLabel="Total users"
          link={<Link href="/users" className={a.metricGroupLink}>Manage <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Students', value: fmt(kpis.studentsCount) },
            { label: 'Instructors', value: fmt(kpis.instructorsCount) },
          ]}
        />
        <MetricGroup
          title="Courses" icon={<BookOutlined />}
          lead={fmt(kpis.publishedCourses)} leadLabel="Published courses"
          link={<Link href="/courses" className={a.metricGroupLink}>Manage <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Draft', value: fmt(kpis.draftCourses) },
            { label: 'Total', value: fmt(kpis.publishedCourses + kpis.draftCourses) },
          ]}
        />
        <MetricGroup
          title="Simulation Access" icon={<ExperimentOutlined />}
          lead={fmt(kpis.assignedSimulationCatalogs)} leadLabel="Assigned catalogs"
          link={<Link href="/simulations" className={a.metricGroupLink}>Browse <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Simulations in catalogs', value: fmt(catalogItems) },
            { label: 'WebGL builds ready', value: fmt(kpis.webglReady) },
          ]}
        />
      </div>

      {/* D. Operations */}
      <div className={a.sectionLabel}><h2>Operations</h2></div>
      <Row gutter={[16, 0]}>
        <Col xs={24} xl={16}>
          {/* Academic structure */}
          <AdminCard
            id="academic-structure"
            title="Academic Structure"
            icon={<ApartmentOutlined />}
            helper={`${fmt(kpis.departmentsCount)} departments · ${fmt(kpis.academicYearsCount)} academic years · ${fmt(kpis.semesterTermsCount)} semester terms`}
            extra={<Link href={institutionHref}><Button size="small" type="link">Manage structure</Button></Link>}
          >
            {sections.academicStructure.length === 0 ? (
              <StateBlock
                compact
                icon={<ApartmentOutlined />}
                title="No departments yet"
                text="Add departments to organise courses, instructors, and students."
                actions={<Link href={institutionHref}><Button>Set up departments</Button></Link>}
              />
            ) : (
              <ul className={a.deptGrid}>
                {sections.academicStructure.map((d) => (
                  <li key={d.id} className={a.deptTile}>
                    <span className={a.deptCode}>{d.code ?? '—'}</span>
                    <span className={a.deptName}>{d.name}</span>
                    {noManagerIds.has(d.id) && <Chip tone="warning">No manager</Chip>}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          {/* Course follow-up */}
          <AdminCard
            id="course-follow-up"
            title="Course Follow-up"
            icon={<BookOutlined />}
            helper="Courses that are not ready for students yet"
            extra={<Link href="/courses"><Button size="small" type="link">All courses</Button></Link>}
          >
            {courseIssues === 0 ? (
              <span className={a.healthLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleFilled style={{ color: '#059669' }} />
                <span><strong style={{ color: '#111827', fontWeight: 600 }}>Nothing needs attention right now.</strong> Every course is published and has content.</span>
              </span>
            ) : (
              <ul className={a.kvList}>
                {draftCount > 0 && (
                  <li className={a.kvRow}>
                    <span className={a.kvLabel}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>Draft courses</span>
                      <span className={a.cellSub}>Not visible to students until published.</span>
                    </span>
                    <Chip tone="warning">{fmt(draftCount)} draft</Chip>
                    <Link href="/courses"><Button size="small">Review</Button></Link>
                  </li>
                )}
                {noModules.map((c) => (
                  <li key={c.id} className={a.kvRow}>
                    <span className={a.kvLabel}>
                      <Link href={`/courses/${c.id}`} className={a.cellTitle} style={{ fontSize: 13 }}>{c.title}</Link>
                      <span className={a.cellSub}>No modules yet — students have nothing to work on.</span>
                    </span>
                    <StatusChip status={c.status} />
                    <Link href={`/courses/${c.id}`}><Button size="small">Manage</Button></Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          {/* Simulation catalogs */}
          <AdminCard
            id="simulation-catalogs"
            title="Simulation Catalogs"
            icon={<AppstoreAddOutlined />}
            helper="Catalogs assigned to your institution by the platform"
            extra={<Link href="/simulation-catalogs"><Button size="small" type="link">View catalogs</Button></Link>}
            flush
          >
            {catalogs.length === 0 ? (
              <StateBlock
                compact
                icon={<AppstoreAddOutlined />}
                title="No catalogs assigned yet"
                text="Simulation catalogs are assigned by the platform administrator. Once assigned, instructors can add their simulations to courses."
              />
            ) : (
              <Table<CatalogRow>
                size="small"
                rowKey={(r, i) => r.id ?? String(i)}
                pagination={false}
                dataSource={catalogs}
                columns={[
                  { title: 'Catalog', dataIndex: 'name', render: (v: string) => <span className={a.cellTitle} style={{ fontSize: 13 }}>{v}</span> },
                  {
                    title: 'Simulations', dataIndex: 'itemCount', align: 'right', width: 120,
                    render: (v?: number) => <span className={a.numeric}>{fmt(v)}</span>,
                  },
                  {
                    title: 'Action', key: 'action', align: 'right', width: 100,
                    render: () => <Link href="/simulations"><Button size="small">Browse</Button></Link>,
                  },
                ]}
              />
            )}
          </AdminCard>
        </Col>

        {/* Right rail — one connected panel */}
        <Col xs={24} xl={8}>
          <AdminCard id="workspace" title="Workspace" icon={<UserOutlined />} flush>
            <div className={a.railSection}>
              <span className={a.railHeading}>Quick actions</span>
              <ul className={a.linkList}>
                {data.quick_actions.map((qa) => (
                  <li key={qa.href + qa.label}>
                    <Link href={qa.href} className={a.linkRow}>
                      <ArrowRightOutlined />
                      <span className={a.linkRowLabel}>{qa.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className={a.railSection}>
              <span className={a.railHeading}>Inbox</span>
              <ul className={a.linkList}>
                <li>
                  <Link href="/notifications" className={a.linkRow}>
                    <BellOutlined />
                    <span className={a.linkRowLabel}>Notifications</span>
                    {data.notifications.unread > 0
                      ? <Chip tone="info">{data.notifications.unread} unread</Chip>
                      : <span className={a.cellSub}>No unread</span>}
                  </Link>
                </li>
                <li>
                  <Link href="/mail" className={a.linkRow}>
                    <MailOutlined />
                    <span className={a.linkRowLabel}>Messages</span>
                    {data.messages.unread > 0
                      ? <Chip tone="info">{data.messages.unread} unread</Chip>
                      : <span className={a.cellSub}>No unread</span>}
                  </Link>
                </li>
              </ul>
            </div>
          </AdminCard>
        </Col>
      </Row>
    </div>
  );
}

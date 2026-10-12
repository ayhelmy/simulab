'use client';

/**
 * Super Admin platform dashboard — a calm operations console.
 * Reading order: compact summary + main actions · critical alerts (only what
 * needs action) · four grouped metrics · operations area (institution table +
 * catalog assignment / system health) · platform activity (secondary).
 * Data: GET /dashboard/platform (unchanged).
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRoleRouteGuard } from '@/hooks/useRoleRouteGuard';
import { getPlatformDashboard, type PlatformDashboard } from '@/lib/dashboard';
import type { InstitutionOverviewRow, RecentActivityItem } from '@/types';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import { Row, Col, Table, Button } from 'antd';
import {
  BankOutlined, TeamOutlined, BookOutlined, ExperimentOutlined, FileTextOutlined,
  AlertOutlined, AppstoreAddOutlined, ApiOutlined, CloudServerOutlined,
  AuditOutlined, CheckCircleFilled, ArrowRightOutlined, StopOutlined, WarningOutlined,
} from '@ant-design/icons';
import { Chip, type ChipTone } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminCard, MetricGroup, StatusChip,
  StateBlock, LoadErrorCard, formatWhen,
} from '@/components/admin/adminUi';

interface AlertItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  /** One line — the strip stays compact. */
  text: string;
  count: number;
  /** Word after the count in the chip ("1 suspended"). */
  unit: string;
  tone: Extract<ChipTone, 'error' | 'warning' | 'info'>;
  href?: string;
  action?: string;
  /** Shown instead of an action when the admin can't act on it directly. */
  note?: string;
  /** Label for the small green chip when the count is zero. */
  clearLabel: string;
}

const ACTIVITY_TYPE: Record<RecentActivityItem['type'], string> = {
  audit: 'Platform change',
  quiz_attempt: 'Quiz attempt',
  simulation_session: 'Simulation session',
  grade_posted: 'Grade posted',
};

const ACTIVITY_LIMIT = 5;

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());

export default function PlatformDashboardPage() {
  const allowed = useRoleRouteGuard('super_admin');
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PlatformDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPlatformDashboard()
      .then(setData)
      .catch(() => setError('Failed to load the platform dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;
  if (loading && !data) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className={ADMIN_PAGE_CLASS}>
        <LoadErrorCard
          title="Could not load the platform dashboard"
          text="Platform health and metrics could not be loaded. Check the connection or try again."
          onRetry={load}
        />
      </div>
    );
  }
  if (!data || !user) return null;

  const { kpis, sections } = data;
  const health = sections.systemHealth;
  const catalogs = sections.simulationCatalogAssignment;

  // Most severe first. Items with a zero count leave the strip and become a
  // small green chip in its header.
  const alertCandidates: AlertItem[] = [
    {
      key: 'alerts', icon: <AlertOutlined />, title: 'System alerts',
      text: 'Platform notices waiting for an administrator.',
      count: kpis.systemAlerts, unit: 'open', tone: 'error',
      href: '/notifications', action: 'View Alerts', clearLabel: 'No system alerts',
    },
    {
      key: 'webgl', icon: <ExperimentOutlined />, title: 'Failed WebGL builds',
      text: 'These simulations cannot launch until re-uploaded.',
      count: health.webglBuildsFailed, unit: 'failed', tone: 'error',
      href: '/simulations', action: 'Review Simulations', clearLabel: 'WebGL builds healthy',
    },
    {
      key: 'suspended', icon: <StopOutlined />, title: 'Suspended institutions',
      text: 'Their users cannot sign in or launch simulations.',
      count: kpis.suspendedInstitutions, unit: 'suspended', tone: 'warning',
      href: '/institutions', action: 'Review Institutions', clearLabel: 'No suspended institutions',
    },
    {
      key: 'nocatalog', icon: <AppstoreAddOutlined />, title: 'Institutions without catalogs',
      text: 'Their instructors have no simulations to add.',
      count: catalogs.institutionsWithoutCatalogs, unit: 'without catalogs', tone: 'warning',
      href: '/simulation-catalogs', action: 'Assign Catalogs', clearLabel: 'All institutions have catalogs',
    },
    {
      key: 'grading', icon: <FileTextOutlined />, title: 'Pending quiz grading',
      text: 'Quiz attempts waiting across all institutions.',
      count: kpis.pendingQuizGrading, unit: 'pending', tone: 'info',
      // Grading happens in instructor gradebooks; Super Admin has no gradebook.
      note: 'Graded by instructors', clearLabel: 'No pending grading',
    },
  ];
  const alerts = alertCandidates.filter((i) => i.count > 0);
  const clear = alertCandidates.filter((i) => i.count === 0);
  const criticalCount = alerts.filter((i) => i.tone !== 'info').length;

  const institutionColumns = [
    {
      title: 'Institution', dataIndex: 'name', key: 'name',
      render: (v: string, r: InstitutionOverviewRow) => <Link href={`/institutions/${r.id}`} className={a.cellTitle}>{v}</Link>,
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 104, render: (s: string) => <StatusChip status={s} /> },
    { title: 'Users', dataIndex: 'usersCount', key: 'users', align: 'right' as const, width: 72, render: (v: number) => <span className={a.numeric}>{fmt(v)}</span> },
    { title: 'Active 30d', dataIndex: 'activeUsersMonth', key: 'active', align: 'right' as const, width: 92, render: (v: number) => <span className={a.numeric}>{fmt(v)}</span> },
    { title: 'Departments', dataIndex: 'departmentsCount', key: 'depts', align: 'right' as const, width: 104, render: (v: number) => <span className={a.numeric}>{fmt(v)}</span> },
    { title: 'Courses', dataIndex: 'coursesCount', key: 'courses', align: 'right' as const, width: 76, render: (v: number) => <span className={a.numeric}>{fmt(v)}</span> },
    {
      title: 'Last activity', dataIndex: 'lastActivity', key: 'last', width: 112,
      render: (v: string | null) => v
        ? <span style={{ whiteSpace: 'nowrap' }} title={new Date(v).toLocaleString()}>{formatWhen(v)}</span>
        : <span className={a.muted}>Never</span>,
    },
    {
      title: 'Action', key: 'actions', align: 'right' as const, width: 88, fixed: 'right' as const,
      render: (_: unknown, r: InstitutionOverviewRow) => (
        <Link href={`/institutions/${r.id}`}><Button size="small">Manage</Button></Link>
      ),
    },
  ];

  const activity = data.recent_activity.slice(0, ACTIVITY_LIMIT);

  return (
    <div className={ADMIN_PAGE_CLASS}>
      {/* 1. Compact platform summary */}
      <header className={a.summary}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <div className={a.titleRow}>
            <h1 className={a.title}>Welcome back, {user.firstName}</h1>
            <Chip tone="info">Super Admin</Chip>
          </div>
          <p className={a.subtitle}>Monitor institutions, users, catalogs, simulations, and platform health.</p>
        </div>
        <div className={a.headerActions}>
          <Button type="primary" icon={<BankOutlined />} onClick={() => router.push('/institutions')}>Manage Institutions</Button>
          <Button icon={<AppstoreAddOutlined />} onClick={() => router.push('/simulation-catalogs')}>Manage Catalogs</Button>
          <Button icon={<AlertOutlined />} onClick={() => router.push('/notifications')}>View System Alerts</Button>
        </div>
      </header>

      {/* 2. Critical alerts — only what needs action */}
      <AdminCard
        id="critical-alerts"
        title="Needs Attention"
        icon={<WarningOutlined />}
        extra={
          <div className={a.clearChips}>
            {criticalCount > 0 && <Chip tone="error">{criticalCount} critical</Chip>}
            {clear.map((c) => (
              <Chip key={c.key} tone="success" icon={<CheckCircleFilled />}>{c.clearLabel}</Chip>
            ))}
          </div>
        }
        flush
      >
        {alerts.length === 0 ? (
          <div className={a.cardBody}>
            <span className={a.healthLabel} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleFilled style={{ color: '#059669' }} /> No critical issues. All institutions, builds, and catalogs are in order.
            </span>
          </div>
        ) : (
          <ul className={a.alerts}>
            {alerts.map((i) => (
              <li key={i.key} className={a.alert} data-tone={i.tone}>
                <div className={a.alertHead}>
                  {i.icon}
                  <p className={a.alertTitle}>{i.title}</p>
                </div>
                <p className={a.alertText}>{i.text}</p>
                <div className={a.alertFoot}>
                  <Chip tone={i.tone}>{fmt(i.count)} {i.unit}</Chip>
                  {i.href ? (
                    <Link href={i.href} className={a.alertAction}>{i.action} <ArrowRightOutlined /></Link>
                  ) : i.note ? (
                    <span className={a.alertNote}>{i.note}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {/* 3. Key metrics — one balanced row */}
      <div className={a.sectionLabel}>
        <h2>Platform Metrics</h2>
      </div>
      <div className={a.metricGroups}>
        <MetricGroup
          title="Institutions" icon={<BankOutlined />}
          lead={fmt(kpis.totalInstitutions)} leadLabel="Total institutions"
          link={<Link href="/institutions" className={a.metricGroupLink}>Manage <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Active', value: fmt(kpis.activeInstitutions) },
            { label: 'Suspended', value: fmt(kpis.suspendedInstitutions), tone: kpis.suspendedInstitutions > 0 ? 'error' : undefined },
          ]}
        />
        <MetricGroup
          title="Users" icon={<TeamOutlined />}
          lead={fmt(kpis.totalUsers)} leadLabel="Total users"
          link={<Link href="/users" className={a.metricGroupLink}>Manage <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Active', value: fmt(kpis.activeUsers) },
          ]}
        />
        <MetricGroup
          title="Courses & Catalogs" icon={<BookOutlined />}
          lead={fmt(kpis.totalCourses)} leadLabel="Courses"
          link={<Link href="/simulation-catalogs" className={a.metricGroupLink}>Catalogs <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Active courses', value: fmt(kpis.activeCourses) },
            { label: 'Catalogs', value: fmt(kpis.totalSimulationCatalogs) },
          ]}
        />
        <MetricGroup
          title="Simulation Health" icon={<ExperimentOutlined />}
          lead={fmt(health.webglBuildsReady)} leadLabel="WebGL builds ready"
          link={<Link href="/simulations" className={a.metricGroupLink}>Simulations <ArrowRightOutlined /></Link>}
          rows={[
            { label: 'Failed', value: fmt(health.webglBuildsFailed), tone: health.webglBuildsFailed > 0 ? 'error' : undefined },
            { label: 'Processing', value: fmt(health.webglBuildsProcessing) },
          ]}
        />
      </div>

      {/* 4. Main operations area */}
      <div className={a.sectionLabel}>
        <h2>Operations</h2>
      </div>
      <Row gutter={[16, 0]}>
        <Col xs={24} xl={17}>
          <AdminCard
            id="institution-overview"
            title="Institution Overview"
            icon={<BankOutlined />}
            helper="Status and usage per institution"
            extra={<Link href="/institutions"><Button size="small" type="link">View all</Button></Link>}
            flush
          >
            {sections.institutionOverview.length === 0 ? (
              <StateBlock
                compact
                icon={<BankOutlined />}
                title="No institutions yet"
                text="Create the first institution to start assigning users, departments, and simulation catalogs."
                actions={<Button type="primary" onClick={() => router.push('/institutions')}>New Institution</Button>}
              />
            ) : (
              <>
                <div className={`${a.desktopOnly} ${a.compactTable}`}>
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={sections.institutionOverview}
                    scroll={{ x: 820 }}
                    columns={institutionColumns}
                  />
                </div>
                <ul className={a.mobileList}>
                  {sections.institutionOverview.map((r) => (
                    <li key={r.id} className={a.mobileItem}>
                      <div className={a.mobileItemHead}>
                        <Link href={`/institutions/${r.id}`} className={a.cellTitle}>{r.name}</Link>
                        <StatusChip status={r.status} />
                      </div>
                      <div className={a.mobileMeta}>
                        {fmt(r.usersCount)} users · {fmt(r.activeUsersMonth)} active 30d · {fmt(r.departmentsCount)} departments · {fmt(r.coursesCount)} courses
                      </div>
                      <div className={a.mobileMeta}>Last activity: {r.lastActivity ? formatWhen(r.lastActivity) : 'Never'}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </AdminCard>

          {/* 5. Platform activity — secondary */}
          <AdminCard
            id="platform-activity"
            title="Platform Activity"
            icon={<AuditOutlined />}
            helper={data.recent_activity.length > ACTIVITY_LIMIT ? `Latest ${ACTIVITY_LIMIT} events` : 'Latest events'}
            extra={<Link href="/audit-logs"><Button size="small" type="link">Open Audit Logs</Button></Link>}
            flush
          >
            {activity.length === 0 ? (
              <StateBlock compact icon={<AuditOutlined />} title="No recent activity" text="Platform events will appear here as institutions, users, and catalogs change." />
            ) : (
              <ol className={a.activity}>
                {activity.map((item, idx) => (
                  <li key={`${item.at}-${idx}`} className={a.activityItem}>
                    <p className={a.activityTitle}>
                      {item.title}
                      <Chip tone="neutral">{ACTIVITY_TYPE[item.type] ?? 'Event'}</Chip>
                    </p>
                    <time className={a.activityTime} dateTime={item.at} title={new Date(item.at).toLocaleString()}>{formatWhen(item.at)}</time>
                    <p className={a.activityText}>{item.description}</p>
                  </li>
                ))}
              </ol>
            )}
          </AdminCard>
        </Col>

        <Col xs={24} xl={7}>
          {/* Side by side on tablets, stacked in the right rail on desktop. */}
          <Row gutter={[16, 0]}>
          <Col xs={24} md={12} xl={24}>
          {/* Catalog assignment */}
          <AdminCard id="catalog-assignment" title="Catalog Assignment" icon={<AppstoreAddOutlined />}>
            <ul className={a.kvList}>
              <li className={a.kvRow}>
                <span className={a.kvLabel}>Catalogs assigned</span>
                <span className={a.kvValue}>{fmt(catalogs.catalogsAssigned)}</span>
              </li>
              <li className={a.kvRow}>
                <span className={a.kvLabel}>Catalogs unassigned</span>
                <span className={a.kvValue}>{fmt(catalogs.catalogsUnassigned)}</span>
              </li>
              <li className={a.kvRow} data-tone={catalogs.institutionsWithoutCatalogs > 0 ? 'error' : undefined}>
                <span className={a.kvLabel}>Institutions without catalogs</span>
                <span className={a.kvValue}>{fmt(catalogs.institutionsWithoutCatalogs)}</span>
              </li>
            </ul>
            {catalogs.recentAssignments.length > 0 && (
              <>
                <span className={a.settingGroupLabel} style={{ marginTop: 12 }}>Recent assignments</span>
                <ul className={a.kvList}>
                  {catalogs.recentAssignments.slice(0, 2).map((r, i) => (
                    <li key={`${r.catalogName}-${i}`} className={a.kvRow}>
                      <span className={a.kvLabel}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{r.catalogName}</span>
                        <span className={a.cellSub}>{r.institutionName}{r.at ? ` · ${formatWhen(r.at)}` : ''}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className={a.cardFoot}>
              <Button block icon={<AppstoreAddOutlined />} onClick={() => router.push('/simulation-catalogs')}>Manage Catalogs</Button>
            </div>
          </AdminCard>
          </Col>

          <Col xs={24} md={12} xl={24}>
          {/* System health */}
          <AdminCard id="system-health" title="System Health" icon={<CloudServerOutlined />}>
            <ul className={a.kvList}>
              <li className={a.kvRow}>
                <span className={a.dotOk} aria-hidden />
                <span className={a.kvLabel}>WebGL builds ready</span>
                <span className={a.kvValue}>{fmt(health.webglBuildsReady)}</span>
              </li>
              <li className={a.kvRow} data-tone={health.webglBuildsFailed > 0 ? 'error' : undefined}>
                <span className={health.webglBuildsFailed > 0 ? a.dotErr : a.dotIdle} aria-hidden />
                <span className={a.kvLabel}>Failed</span>
                <span className={a.kvValue}>{fmt(health.webglBuildsFailed)}</span>
              </li>
              <li className={a.kvRow}>
                <span className={health.webglBuildsProcessing > 0 ? a.dotWarn : a.dotIdle} aria-hidden />
                <span className={a.kvLabel}>Processing</span>
                <span className={a.kvValue}>{fmt(health.webglBuildsProcessing)}</span>
              </li>
              {kpis.storageUsedGb != null && (
                <li className={a.kvRow}>
                  <span className={a.dotIdle} aria-hidden />
                  <span className={a.kvLabel}>Storage used</span>
                  <span className={a.kvValue}>{kpis.storageUsedGb.toLocaleString()} GB</span>
                </li>
              )}
              <li className={a.kvRow}>
                <ApiOutlined style={{ color: '#5C98B7', fontSize: 12 }} aria-hidden />
                <span className={a.kvLabel}>LTI status</span>
                <span className={a.cellSub}>On the LTI page</span>
              </li>
            </ul>
            <div className={a.cardFoot}>
              <Button block icon={<ApiOutlined />} onClick={() => router.push('/lti-settings')}>Open LTI</Button>
            </div>
          </AdminCard>
          </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}

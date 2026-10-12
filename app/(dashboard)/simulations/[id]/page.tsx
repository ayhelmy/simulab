'use client';

// Next.js 16: params is a Promise in server components; use `use()` in client components.

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Button, Tag, Spin, Alert, Typography, Card, Row, Col,
  Descriptions, Progress, App, Divider, List,
} from 'antd';
import {
  ArrowLeftOutlined, RocketOutlined, ClockCircleOutlined,
  TrophyOutlined, ExperimentOutlined, SafetyOutlined, CheckCircleFilled,
  EyeOutlined, PlusOutlined, BarChartOutlined, AppstoreOutlined,
  ThunderboltOutlined, FileTextOutlined, CloudServerOutlined,
} from '@ant-design/icons';
import { Chip, Fact, learningStyles as ls, type ChipTone } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as adm, AdminHeader, AdminCard, StatusChip, BuildChip,
  StatTile, StateBlock, statusLabel,
} from '@/components/admin/adminUi';
import CoursePickerModal, { type CoursePickerPurpose } from '@/components/instructor/CoursePickerModal';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import {
  getSimulation, launchSimulation, demoLaunchSimulation, type LaunchResult,
} from '@/lib/simulations';
import type { SimulationDetail } from '@/types';

const { Text, Title, Paragraph } = Typography;

const DIFF_COLOR: Record<string, string> = {
  beginner: 'green', intermediate: 'blue', advanced: 'red',
};

const VISIBILITY_LABEL: Record<string, string> = {
  private: 'Private', institution: 'Institution', demo_public: 'Demo / Public',
};

interface Props {
  params: Promise<{ id: string }>;
}

// -- Admin view ----------------------------------------------------------------
// Super Admin: availability, build health, catalog and institution access first;
// the learner launch panel is replaced by management actions.

const AVAILABILITY: Record<string, { label: string; tone: ChipTone; text: string }> = {
  demo_public: {
    label: 'Public demo', tone: 'primary',
    text: 'Anyone can open this simulation as a public demo, without signing in or being enrolled.',
  },
  demo_and_institution: {
    label: 'Demo + Institution', tone: 'info',
    text: 'Available as a public demo, and to institutions whose assigned catalogs include it.',
  },
  institution: {
    label: 'Institution', tone: 'info',
    text: 'Only institutions whose assigned simulation catalogs include it can use this simulation in their courses.',
  },
  private: {
    label: 'Private', tone: 'neutral',
    text: 'Not available to institutions or as a demo.',
  },
};

// -- Institution admin view -----------------------------------------------------
// Same structure as the platform view, scoped to the institution: preview,
// what the simulation teaches and how it is scored, and how the institution
// gets access. No build or catalog management.

function InstitutionSimulationDetail({ sim, passPercent }: { sim: SimulationDetail; passPercent: number }) {
  const router = useRouter();
  const isWebGL = sim.launchType === 'webgl' || sim.type === 'webgl';
  const access = AVAILABILITY[sim.visibility] ?? { label: sim.visibility, tone: 'neutral' as ChipTone, text: '' };
  const objectives = Array.isArray(sim.learningObjectives) ? sim.learningObjectives : [];
  const active = sim.status === 'active';

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ paddingInline: 0, marginBottom: 8 }}>
        Back
      </Button>

      <AdminHeader
        title={sim.title}
        badges={<StatusChip status={sim.status} />}
        subtitle={
          <span className={adm.detailMeta} style={{ marginTop: 2 }}>
            {isWebGL
              ? <Chip tone="info" icon={<ThunderboltOutlined />}>WebGL</Chip>
              : <Chip tone="neutral">{sim.type.toUpperCase()}</Chip>}
            <Chip tone="neutral">{statusLabel(sim.difficulty)}</Chip>
            {sim.estimatedMinutes ? <Chip tone="neutral" icon={<ClockCircleOutlined />}>{sim.estimatedMinutes} min</Chip> : null}
            {sim.discipline && <Chip tone="neutral">{sim.discipline}</Chip>}
            <Chip tone={access.tone}>{access.label}</Chip>
          </span>
        }
        actions={<Link href="/simulations"><Button icon={<AppstoreOutlined />}>View Catalog</Button></Link>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <AdminCard title="Overview" icon={<ExperimentOutlined />}>
            {sim.thumbnailUrl ? (
              <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', maxHeight: 280, border: '1px solid #DDDEDF' }}>
                <img src={sim.thumbnailUrl} alt={`${sim.title} screenshot`} style={{ width: '100%', objectFit: 'cover', maxHeight: 280, display: 'block' }} />
              </div>
            ) : (
              <div style={{
                marginBottom: 16, height: 160, borderRadius: 8, border: '1px solid #DDDEDF', background: '#EDF4F8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C98B7', fontSize: 36,
              }} aria-hidden>
                <ExperimentOutlined />
              </div>
            )}
            <p style={{ margin: 0, lineHeight: 1.7 }}>{sim.description || <span className={adm.muted}>No description provided.</span>}</p>
          </AdminCard>

          <AdminCard title="Details" icon={<FileTextOutlined />}>
            {/* Six facts in even rows of three (two on phones). */}
            <div className={ls.factGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))' }}>
              <Fact label="Type" value={isWebGL ? 'WebGL' : sim.type.toUpperCase()} />
              <Fact label="Difficulty" value={statusLabel(sim.difficulty)} />
              <Fact label="Duration" value={sim.estimatedMinutes ? `${sim.estimatedMinutes} min` : '—'} />
              <Fact label="Discipline" value={sim.discipline ?? '—'} />
              <Fact label="Max attempts" value={sim.maxAttempts ? sim.maxAttempts : 'Unlimited'} />
              <Fact label="Version" value={sim.version ? `v${sim.version}` : '—'} />
            </div>
          </AdminCard>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={10}>
              <AdminCard title="Scoring" icon={<TrophyOutlined />}>
                <div className={adm.tiles} style={{ gridTemplateColumns: '1fr' }}>
                  <StatTile label="Pass threshold" value={`${sim.passScore} / ${sim.maxScore} pts`} />
                  <StatTile label="Pass percentage" value={Number.isFinite(passPercent) ? `${passPercent}%` : '—'} tone="info" />
                </div>
              </AdminCard>
            </Col>
            <Col xs={24} md={14}>
              <AdminCard title="Learning Objectives" icon={<SafetyOutlined />}>
                {objectives.length ? (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {objectives.map((obj, i) => (
                      <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.6 }}>
                        <CheckCircleFilled style={{ color: '#5C98B7', marginTop: 4, flexShrink: 0 }} />
                        <span>{obj as string}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <StateBlock compact title="No learning objectives" text="Learning objectives added to this simulation will appear here." />
                )}
              </AdminCard>
            </Col>
          </Row>
        </Col>

        <Col xs={24} xl={8}>
          <AdminCard title="Preview" icon={<EyeOutlined />} style={{ position: 'sticky', top: 76 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href={`/simulations/${sim.id}/play`}>
                <Button type="primary" block icon={<EyeOutlined />} disabled={!active}>Preview Simulation</Button>
              </Link>
              <span className={adm.cellSub} style={{ fontSize: 12 }}>
                {active
                  ? 'Opens the simulation directly, outside any course.'
                  : `This simulation is ${sim.status} and cannot be previewed until it is active.`}
              </span>
            </div>
            <span className={adm.settingGroupLabel}>Access</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span><Chip tone={access.tone}>{access.label}</Chip></span>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>{access.text}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>
                Instructors add it to their courses from the Simulations page.
              </p>
            </div>
          </AdminCard>
        </Col>
      </Row>
    </div>
  );
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

function AdminSimulationDetail({ sim, passPercent }: { sim: SimulationDetail; passPercent: number }) {
  const router = useRouter();
  const isWebGL = sim.launchType === 'webgl' || sim.type === 'webgl';
  const access = AVAILABILITY[sim.visibility] ?? { label: sim.visibility, tone: 'neutral' as ChipTone, text: '' };
  const objectives = Array.isArray(sim.learningObjectives) ? sim.learningObjectives : [];

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => router.push('/simulations')} style={{ paddingInline: 0, marginBottom: 8 }}>
        Back to Simulations
      </Button>

      <AdminHeader
        eyebrow="Simulation"
        title={sim.title}
        badges={<StatusChip status={sim.status} />}
        subtitle={
          <span className={adm.detailMeta} style={{ marginTop: 2 }}>
            {sim.discipline && <Chip tone="neutral">{sim.discipline}</Chip>}
            {isWebGL
              ? <Chip tone="info" icon={<ThunderboltOutlined />}>WebGL</Chip>
              : <Chip tone="neutral">{sim.type.toUpperCase()}</Chip>}
            {isWebGL && sim.buildStatus && <BuildChip status={sim.buildStatus} />}
            <Chip tone={access.tone}>{access.label}</Chip>
          </span>
        }
        actions={
          <>
            <Link href={`/simulations/${sim.id}/play`}>
              <Button type="primary" icon={<EyeOutlined />} disabled={sim.status !== 'active'}>Preview Simulation</Button>
            </Link>
            <Button icon={<SafetyOutlined />} onClick={() => document.getElementById('access')?.scrollIntoView({ behavior: 'smooth' })}>
              Manage Access
            </Button>
            <Link href="/simulation-catalogs"><Button icon={<AppstoreOutlined />}>Assign to Catalog</Button></Link>
            <Link href="/audit-logs"><Button icon={<BarChartOutlined />}>View Activity</Button></Link>
          </>
        }
      />

      {sim.status !== 'active' && (
        <div className={adm.note} style={{ background: '#FEF3C7', borderColor: '#FDE68A', color: '#92400E' }}>
          <ExperimentOutlined style={{ color: '#D97706' }} />
          <span>This simulation is <strong>{sim.status}</strong>. It cannot be previewed or launched until it is active.</span>
        </div>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <AdminCard title="Overview" icon={<ExperimentOutlined />}>
            {sim.thumbnailUrl && (
              <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', maxHeight: 260, border: '1px solid #DDDEDF' }}>
                <img src={sim.thumbnailUrl} alt={`${sim.title} screenshot`} style={{ width: '100%', objectFit: 'cover', maxHeight: 260, display: 'block' }} />
              </div>
            )}
            <p style={{ margin: 0, lineHeight: 1.7 }}>{sim.description || <span className={adm.muted}>No description provided.</span>}</p>
          </AdminCard>

          <AdminCard title="Metadata" icon={<FileTextOutlined />}>
            <div className={ls.factGrid}>
              <Fact label="Type" value={isWebGL ? 'WebGL' : sim.type.toUpperCase()} />
              <Fact label="Difficulty" value={statusLabel(sim.difficulty)} />
              <Fact label="Duration" value={sim.estimatedMinutes ? `${sim.estimatedMinutes} min` : '—'} />
              <Fact label="Discipline" value={sim.discipline ?? '—'} />
              <Fact label="Version" value={sim.version ? `v${sim.version}` : '—'} />
              <Fact label="Max attempts" value={sim.maxAttempts ? sim.maxAttempts : 'Unlimited'} />
            </div>
          </AdminCard>

          <AdminCard title="Scoring" icon={<TrophyOutlined />}>
            <div className={adm.tiles}>
              <StatTile label="Pass threshold" value={`${sim.passScore} / ${sim.maxScore} pts`} />
              <StatTile label="Pass percentage" value={Number.isFinite(passPercent) ? `${passPercent}%` : '—'} tone="info" />
            </div>
          </AdminCard>

          <AdminCard title="Learning Objectives" icon={<SafetyOutlined />}>
            {objectives.length ? (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {objectives.map((obj, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.6 }}>
                    <CheckCircleFilled style={{ color: '#5C98B7', marginTop: 4, flexShrink: 0 }} />
                    <span>{obj as string}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <StateBlock compact title="No learning objectives" text="Learning objectives added to this simulation will appear here." />
            )}
          </AdminCard>
        </Col>

        <Col xs={24} xl={8}>
          <AdminCard title="Build / WebGL Status" icon={<CloudServerOutlined />}>
            {isWebGL ? (
              <ul className={adm.healthList}>
                <li className={adm.healthRow}>
                  <span className={sim.buildStatus === 'ready' ? adm.dotOk : sim.buildStatus === 'failed' ? adm.dotErr : adm.dotWarn} aria-hidden />
                  <span className={adm.healthLabel}>Build status</span>
                  <BuildChip status={sim.buildStatus ?? null} />
                </li>
                <li className={adm.healthRow}>
                  <span className={adm.healthLabel}>Package</span>
                  <span className={adm.healthValue} style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{sim.originalZipFilename ?? '—'}</span>
                </li>
                <li className={adm.healthRow}>
                  <span className={adm.healthLabel}>Size</span>
                  <span className={adm.healthValue}>{formatBytes(sim.fileSizeBytes)}</span>
                </li>
                <li className={adm.healthRow}>
                  <span className={adm.healthLabel}>Entry file</span>
                  <span className={adm.mono}>{sim.entryFile ?? '—'}</span>
                </li>
              </ul>
            ) : (
              <StateBlock compact kind="info" title={`${sim.type.toUpperCase()} simulation`} text="This simulation is not a WebGL build, so there is no build status to monitor." />
            )}
          </AdminCard>

          <AdminCard
            title="Catalog Assignments"
            icon={<AppstoreOutlined />}
            extra={<Link href="/simulation-catalogs"><Button size="small" type="link">Sim Catalogs</Button></Link>}
          >
            {sim.catalogId ? (
              <ul className={adm.healthList}>
                <li className={adm.healthRow}>
                  <AppstoreOutlined style={{ color: '#5C98B7' }} aria-hidden />
                  <span className={adm.healthLabel}>
                    {sim.discipline ?? 'Assigned catalog'}
                    <span className={adm.cellSub}>Manage its simulations and institutions in Sim Catalogs.</span>
                  </span>
                </li>
              </ul>
            ) : (
              <StateBlock
                compact
                title="Not in a catalog"
                text="Add this simulation to a catalog so institutions assigned to that catalog can use it."
                actions={<Link href="/simulation-catalogs"><Button size="small">Assign to Catalog</Button></Link>}
              />
            )}
          </AdminCard>

          <AdminCard id="access" title="Institution Access" icon={<SafetyOutlined />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span><Chip tone={access.tone}>{access.label}</Chip></span>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>{access.text}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#6B7280' }}>
                Institution access follows catalog assignment: assign or revoke the catalog for an institution in Sim Catalogs.
              </p>
              <Link href="/simulation-catalogs"><Button block icon={<SafetyOutlined />}>Manage Access in Sim Catalogs</Button></Link>
            </div>
          </AdminCard>
        </Col>
      </Row>
    </div>
  );
}

export default function SimulationDetailPage({ params }: Props) {
  const { id } = use(params);
  const { hasPermission, hasRole, user } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();

  const [sim,       setSim]       = useState<SimulationDetail | null>(null);
  const [picker,    setPicker]    = useState<CoursePickerPurpose | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const canManage   = hasPermission('simulation_catalogs.manage_global');
  const isGuest     = !user;
  const isStudentTA = hasRole('student') || hasRole('teaching_assistant');
  // Instructor context: preview and attach to a course, never a student launch page.
  const isInstructor = hasRole('instructor') && !hasRole('student');
  const canLaunch   = !isGuest && (
    hasPermission('simulations.view_catalog') ||
    hasPermission('simulation_catalogs.view_assigned') ||
    canManage
  );

  useEffect(() => {
    setLoading(true);
    getSimulation(id)
      .then(setSim)
      .catch((err) => {
        const e = err as { title?: string; status?: number };
        setError(e.status === 404 ? 'Simulation not found.' : (e.title ?? 'Failed to load simulation'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLaunch() {
    if (!sim) return;
    setLaunching(true);
    try {
      let result: LaunchResult;
      if (sim.visibility === 'demo_public') {
        result = await demoLaunchSimulation(sim.id);
      } else {
        result = await launchSimulation(sim.id);
      }
      window.open(result.launchUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to launch simulation');
    } finally {
      setLaunching(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (error || !sim) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/simulations')} style={{ marginBottom: 16 }}>
          Back to Simulations
        </Button>
        <Alert type="error" title={error ?? 'Simulation not found'} showIcon />
      </div>
    );
  }

  const isDemoPublic  = sim.visibility === 'demo_public';
  const showLaunch    = canLaunch || isDemoPublic;
  const passPercent   = Math.round((sim.passScore / sim.maxScore) * 100);

  // Platform admin (manages the global catalog, not enrolled in a course context).
  if (canManage && !isInstructor && !isStudentTA) {
    return <AdminSimulationDetail sim={sim} passPercent={passPercent} />;
  }

  // Institution admin: reviews what the institution can use.
  if (hasRole('institution_admin') && !isInstructor && !isStudentTA) {
    return <InstitutionSimulationDetail sim={sim} passPercent={passPercent} />;
  }

  return (
    <div>
      <PageHeader
        title={sim.title}
        subtitle={sim.description ?? undefined}
        extra={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              Back
            </Button>
            <Link href="/simulations"><Button icon={<AppstoreOutlined />}>View Catalog</Button></Link>
          </div>
        }
      />

      <Row gutter={[24, 24]}>
        {/* -- Left: Details ----------------------------------------------─ */}
        <Col xs={24} lg={16}>
          {sim.thumbnailUrl && (
            <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', maxHeight: 280, border: '1px solid #DDDEDF' }}>
              <img src={sim.thumbnailUrl} alt={sim.title} style={{ width: '100%', objectFit: 'cover', maxHeight: 280 }} />
            </div>
          )}

          <Card style={{ marginBottom: 20 }}>
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Type">
                <Tag color="blue">{sim.type.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Difficulty">
                <Tag color={DIFF_COLOR[sim.difficulty]}>{sim.difficulty}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={sim.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Visibility">
                <Tag color={isDemoPublic ? 'orange' : 'blue'}>
                  {VISIBILITY_LABEL[sim.visibility] ?? sim.visibility}
                </Tag>
              </Descriptions.Item>
              {sim.estimatedMinutes && (
                <Descriptions.Item label="Duration">
                  <Tag icon={<ClockCircleOutlined />}>{sim.estimatedMinutes} min</Tag>
                </Descriptions.Item>
              )}
              {sim.discipline && (
                <Descriptions.Item label="Discipline">{sim.discipline}</Descriptions.Item>
              )}
              <Descriptions.Item label="Version">v{sim.version}</Descriptions.Item>
              <Descriptions.Item label="Max Attempts">
                {sim.maxAttempts ? `${sim.maxAttempts} attempt${sim.maxAttempts > 1 ? 's' : ''}` : 'Unlimited'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Scoring */}
          <Card title={<><TrophyOutlined /> Scoring</>} size="small" style={{ marginBottom: 20 }}>
            <Row gutter={16} align="middle">
              <Col span={12}>
                <Text type="secondary">Pass threshold</Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <Title level={3} style={{ margin: 0 }}>{sim.passScore}</Title>
                  <Text type="secondary">/ {sim.maxScore} pts</Text>
                </div>
              </Col>
              <Col span={12}>
                <Progress
                  type="circle"
                  percent={passPercent}
                  size={72}
                  strokeColor="#F59324"
                  format={(p) => `${p}%`}
                />
              </Col>
            </Row>
          </Card>

          {/* Learning Objectives */}
          {Array.isArray(sim.learningObjectives) && sim.learningObjectives.length > 0 && (
            <Card title={<span style={{ color: '#5C98B7' }}><SafetyOutlined /> Learning Objectives</span>} size="small">
              <List
                size="small"
                dataSource={sim.learningObjectives}
                renderItem={(obj) => (
                  <List.Item style={{ paddingLeft: 0, border: 'none', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10 }}>
                    <CheckCircleFilled style={{ color: '#F59324', fontSize: 16, marginTop: 3, flexShrink: 0 }} />
                    <Text style={{ lineHeight: 1.6 }}>{obj as string}</Text>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>

        {/* -- Right: Launch panel ----------------------------------------─ */}
        <Col xs={24} lg={8}>
          <Card style={{ position: 'sticky', top: 80 }}>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{
                width: 72, height: 72, margin: '0 auto 16px',
                background: '#FEF3E2',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ExperimentOutlined style={{ fontSize: 32, color: '#F59324' }} />
              </div>
              <Title level={4} style={{ marginBottom: 4 }}>{sim.title}</Title>
              {isDemoPublic && <Tag style={{ marginBottom: 12, background: '#F59324', color: '#FFFFFF', border: 'none', fontWeight: 700 }}>Public Demo</Tag>}
            </div>

            <Divider style={{ margin: '0 0 16px' }} />

            {sim.status !== 'active' ? (
              <Alert
                type="warning"
                showIcon
                title="This simulation is not currently active."
                style={{ marginBottom: 16 }}
              />
            ) : null}

            {isInstructor ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href={`/simulations/${sim.id}/play`}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<EyeOutlined />}
                    disabled={sim.status !== 'active'}
                    block
                  >
                    Preview Simulation
                  </Button>
                </Link>
                <Button block icon={<PlusOutlined />} onClick={() => setPicker('add')}>Add to Course</Button>
                <Button block icon={<BarChartOutlined />} onClick={() => setPicker('activity')}>View Activity</Button>
                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Preview opens the simulation directly, outside any course.
                </Text>
              </div>
            ) : showLaunch ? (
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                loading={launching}
                disabled={sim.status !== 'active'}
                onClick={handleLaunch}
                style={{ width: '100%', height: 48, fontSize: 16 }}
              >
                {isDemoPublic ? 'Try Demo' : 'Launch Simulation'}
              </Button>
            ) : (
              <Alert
                type="info"
                showIcon
                title="You don't have access to launch this simulation."
                description="Ask your institution administrator for access."
              />
            )}

            {isStudentTA && !isDemoPublic && (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12 }}>
                Must be enrolled in a course that includes this simulation.
              </Text>
            )}

            {canManage && (
              <>
                <Divider style={{ margin: '16px 0 12px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin</Text>
                  <Button block onClick={() => router.push('/simulations')}>Back to List</Button>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <CoursePickerModal
        open={!!picker}
        purpose={picker ?? 'add'}
        simulation={{ id: sim.id, title: sim.title }}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}

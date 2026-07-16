'use client';

// Next.js 16: params is a Promise in server components; use `use()` in client components.

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Button, Tag, Spin, Alert, Typography, Card, Row, Col,
  Descriptions, Progress, App, Divider, List,
} from 'antd';
import {
  ArrowLeftOutlined, RocketOutlined, ClockCircleOutlined,
  TrophyOutlined, ExperimentOutlined, SafetyOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import {
  getSimulation, launchSimulation, demoLaunchSimulation, type LaunchResult,
} from '@/lib/simulations';
import type { Simulation } from '@/types';

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

export default function SimulationDetailPage({ params }: Props) {
  const { id } = use(params);
  const { hasPermission, hasRole, user } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();

  const [sim,       setSim]       = useState<Simulation | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const canManage   = hasPermission('simulation_catalogs.manage_global');
  const isGuest     = !user;
  const isStudentTA = hasRole('student') || hasRole('teaching_assistant');
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

  return (
    <div>
      <PageHeader
        title={sim.title}
        subtitle={sim.description ?? undefined}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/simulations')}>
            Back
          </Button>
        }
      />

      <Row gutter={[24, 24]}>
        {/* -- Left: Details ----------------------------------------------─ */}
        <Col xs={24} lg={16}>
          {sim.thumbnailUrl && (
            <div style={{ marginBottom: 20, borderRadius: 8, overflow: 'hidden', maxHeight: 280 }}>
              <img src={sim.thumbnailUrl} alt={sim.title} style={{ width: '100%', objectFit: 'cover', maxHeight: 280 }} />
            </div>
          )}

          <Card style={{ marginBottom: 20 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Type">
                <Tag>{sim.type.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Difficulty">
                <Tag color={DIFF_COLOR[sim.difficulty]}>{sim.difficulty}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag status={sim.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Visibility">
                <Tag color={isDemoPublic ? 'success' : 'processing'}>
                  {VISIBILITY_LABEL[sim.visibility] ?? sim.visibility}
                </Tag>
              </Descriptions.Item>
              {sim.estimatedMinutes && (
                <Descriptions.Item label="Duration">
                  <Tag icon={<ClockCircleOutlined />}>{sim.estimatedMinutes} min</Tag>
                </Descriptions.Item>
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
            <Card title={<><SafetyOutlined /> Learning Objectives</>} size="small">
              <List
                size="small"
                dataSource={sim.learningObjectives}
                renderItem={(obj) => (
                  <List.Item style={{ paddingLeft: 0, border: 'none' }}>
                    <Text>• {obj as string}</Text>
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
                background: 'linear-gradient(135deg, #F59324 0%, #E07B15 100%)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ExperimentOutlined style={{ fontSize: 32, color: '#fff' }} />
              </div>
              <Title level={4} style={{ marginBottom: 4 }}>{sim.title}</Title>
              {isDemoPublic && <Tag color="success" style={{ marginBottom: 12 }}>Free Demo</Tag>}
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

            {showLaunch ? (
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
    </div>
  );
}

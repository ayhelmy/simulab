'use client';

/**
 * Student read-only simulation review — score summary plus the ordered list
 * of the simulation's defined steps, marked achieved/missed from the recorded
 * click history of the session that produced this score.
 * Route: /courses/:id/simulation-scores/:scoreId/review
 */

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSimulationScore } from '@/lib/simulation-scores';
import { getSessionStepBreakdown, type StepBreakdownResult } from '@/lib/simulation-activity';
import { getSimulation } from '@/lib/simulations';
import type { SimulationScore, Simulation } from '@/types';
import { Card, Typography, Button, Spin, Alert, Tag, Space, Row, Col, Statistic, Timeline } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, CloseCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Props { params: Promise<{ id: string; scoreId: string }> }

export default function SimulationScoreReviewPage({ params }: Props) {
  const { id: courseId, scoreId } = use(params);

  const [score, setScore] = useState<SimulationScore | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [breakdown, setBreakdown] = useState<StepBreakdownResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getSimulationScore(courseId, scoreId);
      setScore(s);
      const sim = await getSimulation(s.simulationId).catch(() => null);
      setSimulation(sim);
      if (s.simulationActivitySessionId) {
        const b = await getSessionStepBreakdown(s.simulationActivitySessionId).catch(() => null);
        setBreakdown(b);
      }
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to load this score.');
    } finally {
      setLoading(false);
    }
  }, [courseId, scoreId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  if (error || !score) {
    return (
      <Alert
        type="error" showIcon message={error ?? 'Score not found'}
        action={<Link href="/gradebook"><Button size="small">Back to Gradebook</Button></Link>}
      />
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link href="/gradebook"><Button icon={<ArrowLeftOutlined />}>Gradebook</Button></Link>
        <Title level={4} style={{ margin: 0 }}>{simulation?.title ?? 'Simulation'}</Title>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col><Statistic title="Score" value={score.rawScore ?? undefined} suffix={score.pointsPossible != null ? `/ ${score.pointsPossible}` : undefined} /></Col>
          <Col><Statistic title="Percentage" value={score.percentage ?? undefined} suffix="%" /></Col>
          <Col>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Result</Text>
            {score.passed == null ? <Tag>Recorded</Tag> : score.passed ? <Tag color="green">Passed</Tag> : <Tag color="red">Not passed</Tag>}
          </Col>
        </Row>
      </Card>

      <Card size="small" title="Steps">
        {!breakdown || !breakdown.steps.length ? (
          <Text type="secondary">No step-by-step breakdown available for this attempt.</Text>
        ) : (
          <Timeline
            items={breakdown.steps.map(s => ({
              color: s.achieved ? 'green' : 'red',
              icon: s.achieved ? <CheckCircleFilled style={{ color: '#16A34A' }} /> : <CloseCircleOutlined style={{ color: '#DC2626' }} />,
              content: (
                <Space direction="vertical" size={0}>
                  <Text strong={s.achieved}>{s.order}. {s.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {s.achieved ? `Completed${s.achievedAt ? ` at ${new Date(s.achievedAt).toLocaleTimeString()}` : ''}` : 'Not completed'}
                  </Text>
                </Space>
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
}

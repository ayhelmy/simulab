'use client';

/**
 * LTI Deep Linking 2.0 — instructor simulation picker.
 * Reached via a 302 redirect from POST /lti/launch when the LMS sends an
 * LtiDeepLinkingRequest. Route: /lti/deep-linking?token=...
 *
 * Lives outside both (dashboard) and (auth) — instructors reach this from
 * inside their LMS, not via normal in-app navigation (mirrors the top-level
 * /lti/launching, /lti/error pages).
 */

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card, Row, Col, Input, Checkbox, Radio, InputNumber, Select, Button,
  Spin, Result, Empty, Tag, Typography, Space, Alert, App,
} from 'antd';
import { SearchOutlined, ExperimentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  getDeepLinkingContext, submitDeepLinkingResponse,
  type DeepLinkingContext, type DeepLinkingSimulation,
} from '@/lib/lti';

const { Text, Title } = Typography;

const DIFF_COLOR: Record<string, string> = { beginner: 'green', intermediate: 'orange', advanced: 'red' };

function DeepLinkingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { message } = App.useApp();

  const [ctx, setCtx] = useState<DeepLinkingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formTarget, setFormTarget] = useState<{ returnUrl: string; jwt: string } | null>(null);

  const [gradingMode, setGradingMode] = useState<'score' | 'completion' | 'score_and_completion'>('score_and_completion');
  const [maxScore, setMaxScore] = useState(100);
  const [attemptPolicy, setAttemptPolicy] = useState<'best' | 'last' | 'first' | 'average'>('best');
  const [durationLimit, setDurationLimit] = useState<number | null>(null);
  const [launchBehavior, setLaunchBehavior] = useState<'iframe' | 'window'>('iframe');

  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    if (!token) { setError('Missing Deep Linking session token.'); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getDeepLinkingContext(token, search || undefined);
      setCtx(data);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.detail ?? e.title ?? 'This Deep Linking session has expired. Please reopen it from your LMS.');
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => { load(); }, [load]);

  // Auto-submit the hidden form once we have a signed response.
  useEffect(() => {
    if (formTarget && formRef.current) formRef.current.submit();
  }, [formTarget]);

  function toggleSelect(sim: DeepLinkingSimulation) {
    if (ctx?.acceptMultiple) {
      setSelectedIds((prev) => prev.includes(sim.id) ? prev.filter((id) => id !== sim.id) : [...prev, sim.id]);
    } else {
      setSelectedIds([sim.id]);
      setMaxScore(sim.maxScore || 100);
    }
  }

  async function handleSubmit() {
    if (!token || !selectedIds.length || !ctx) return;
    setSubmitting(true);
    try {
      const selections = selectedIds.map((id) => {
        const sim = ctx.simulations.find((s) => s.id === id);
        return {
          simulationId: id,
          title: sim?.title,
          maxScore,
          gradingMode,
          attemptPolicy,
          durationLimit: durationLimit ?? undefined,
          launchBehavior,
        };
      });
      const result = await submitDeepLinkingResponse(token, selections);
      setFormTarget(result);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.detail ?? e.title ?? 'Failed to add simulation(s) to your course.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading simulation library…" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <Result status="error" title="Could Not Load Simulation Library" subTitle={error ?? 'Unknown error.'} />
    );
  }

  if (formTarget) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Adding simulation to your course…" />
        {/* Native form submission (not fetch) — this is a real top-level navigation
            posting the signed content-item JWT back to the LMS's deep_link_return_url. */}
        <form ref={formRef} method="POST" action={formTarget.returnUrl} style={{ display: 'none' }}>
          <input type="hidden" name="JWT" value={formTarget.jwt} />
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 120px' }}>
      <Title level={3}>Add a Simulation{ctx.contextTitle ? ` to ${ctx.contextTitle}` : ''}</Title>
      <Text type="secondary">Select {ctx.acceptMultiple ? 'one or more simulations' : 'a simulation'} from your institution&apos;s assigned catalog.</Text>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Search simulations…"
        allowClear
        style={{ margin: '16px 0' }}
        onChange={(e) => setSearch(e.target.value)}
      />

      {ctx.simulations.length === 0 ? (
        <Empty description="No simulations are assigned to your institution yet. Contact your SimuLearn administrator." />
      ) : (
        <Row gutter={[16, 16]}>
          {ctx.simulations.map((sim) => {
            const selected = selectedIds.includes(sim.id);
            return (
              <Col xs={24} sm={12} md={8} key={sim.id}>
                <Card
                  hoverable
                  onClick={() => toggleSelect(sim)}
                  style={{ borderColor: selected ? '#1677ff' : undefined, borderWidth: selected ? 2 : 1 }}
                  cover={sim.thumbnailUrl ? <img src={sim.thumbnailUrl} alt={sim.title} style={{ height: 120, objectFit: 'cover' }} /> : undefined}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text strong>{sim.title}</Text>
                      {ctx.acceptMultiple
                        ? <Checkbox checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(sim)} />
                        : <Radio checked={selected} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(sim)} />}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: sim.description }}>
                      {sim.description || 'No description.'}
                    </Text>
                    <Space size={6}>
                      {sim.difficulty && <Tag color={DIFF_COLOR[sim.difficulty] ?? 'default'}>{sim.difficulty}</Tag>}
                      {sim.estimatedMinutes != null && (
                        <Tag icon={<ClockCircleOutlined />}>{sim.estimatedMinutes} min</Tag>
                      )}
                      {sim.launchType === 'webgl' && <Tag icon={<ExperimentOutlined />} color="purple">Unity WebGL</Tag>}
                    </Space>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {selectedIds.length > 0 && (
        <Card
          title="Grading Settings"
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10,
            borderRadius: 0, boxShadow: '0 -2px 12px rgba(0,0,0,0.12)',
          }}
        >
          <Row gutter={12} align="middle">
            <Col xs={12} sm={5}>
              <Text style={{ display: 'block', marginBottom: 4 }}>Grading Mode</Text>
              <Select
                style={{ width: '100%' }}
                value={gradingMode}
                onChange={setGradingMode}
                options={[
                  { value: 'score', label: 'Score only' },
                  { value: 'completion', label: 'Completion only' },
                  { value: 'score_and_completion', label: 'Score + Completion' },
                ]}
              />
            </Col>
            <Col xs={12} sm={4}>
              <Text style={{ display: 'block', marginBottom: 4 }}>Max Score</Text>
              <InputNumber style={{ width: '100%' }} min={1} value={maxScore} onChange={(v) => setMaxScore(v ?? 100)} />
            </Col>
            <Col xs={12} sm={5}>
              <Text style={{ display: 'block', marginBottom: 4 }}>Attempt Policy</Text>
              <Select
                style={{ width: '100%' }}
                value={attemptPolicy}
                onChange={setAttemptPolicy}
                options={[
                  { value: 'best', label: 'Best attempt' },
                  { value: 'last', label: 'Last attempt' },
                  { value: 'first', label: 'First attempt' },
                  { value: 'average', label: 'Average' },
                ]}
              />
            </Col>
            <Col xs={12} sm={4}>
              <Text style={{ display: 'block', marginBottom: 4 }}>Duration Limit (min)</Text>
              <InputNumber style={{ width: '100%' }} min={0} placeholder="None" value={durationLimit ?? undefined} onChange={(v) => setDurationLimit(v ?? null)} />
            </Col>
            <Col xs={12} sm={3}>
              <Text style={{ display: 'block', marginBottom: 4 }}>Launch</Text>
              <Select
                style={{ width: '100%' }}
                value={launchBehavior}
                onChange={setLaunchBehavior}
                options={[{ value: 'iframe', label: 'Iframe' }, { value: 'window', label: 'New tab' }]}
              />
            </Col>
            <Col xs={24} sm={3}>
              <Button type="primary" block loading={submitting} onClick={handleSubmit} style={{ marginTop: 20 }}>
                Add {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
              </Button>
            </Col>
          </Row>
          {gradingMode !== 'completion' && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 8 }}
              message="A gradebook column will be created in your LMS for this activity."
            />
          )}
        </Card>
      )}
    </div>
  );
}

export default function DeepLinkingPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
      <DeepLinkingContent />
    </Suspense>
  );
}

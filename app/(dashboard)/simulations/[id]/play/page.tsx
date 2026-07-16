'use client';

/**
 * WebGL Simulation Player — SRS §4.7 SIM-01.
 * Route: /simulations/:id/play?courseId=...&lessonId=...
 *
 * When courseId + lessonId are present, calls the activity-start endpoint which:
 *   1. Validates enrollment and build status
 *   2. Creates an activity session (migration 036)
 *   3. Returns the authorized launch URL + session ID
 *
 * Session lifecycle:
 *   - Heartbeat every 30 s while the page is open
 *   - End session on explicit Exit button click
 *   - Best-effort end on pagehide (keepalive fetch)
 *   - Backend cleanup marks sessions abandoned after heartbeat timeout
 *
 * Click tracking (migration 037):
 *   - mousedown listener injected into the Unity iframe after load
 *   - Only primary-button clicks on the <canvas> element are recorded
 *   - Positions flushed to backend every 25 clicks or every 15 s
 *   - Remaining clicks flushed synchronously before session end
 *   - Best-effort beacon flush on pagehide
 *
 * For direct launch (admin / non-course context): falls back to getSimulationLaunch;
 * no activity session is created.
 */

import { use, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  startSimulationActivity,
  sendHeartbeat,
  endSimulationActivity,
  endActivityBeacon,
  recordClicksBatch,
  flushClicksBeacon,
  type ClickEvent,
} from '@/lib/simulation-activity';
import { getSimulationLaunch } from '@/lib/simulations';
import type { ActivityStartResult, ActivityEndResult } from '@/types';
import {
  Button, Spin, Result, Space, Typography, Tag, Tooltip, Statistic, Modal, Alert,
} from 'antd';
import {
  ArrowLeftOutlined, FullscreenOutlined, FullscreenExitOutlined,
  ExperimentOutlined, ClockCircleOutlined, ThunderboltOutlined,
  LogoutOutlined, CheckCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const HEARTBEAT_INTERVAL_MS  = 30_000;
const CLICK_FLUSH_INTERVAL_MS = 15_000;
const CLICK_BATCH_SIZE        = 25;

const DIFF_COLOR: Record<string, string> = {
  beginner: 'green', intermediate: 'orange', advanced: 'red',
};

/** Format elapsed seconds into MM:SS or H:MM:SS */
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

interface Props { params: Promise<{ id: string }> }

export default function SimulationPlayPage({ params }: Props) {
  const { id: simulationId } = use(params);
  const searchParams          = useSearchParams();
  const courseId              = searchParams.get('courseId') ?? undefined;
  const lessonId              = searchParams.get('lessonId') ?? undefined;
  const { user }              = useAuth();

  const [launchInfo,   setLaunchInfo]   = useState<ActivityStartResult | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [errorCode,    setErrorCode]    = useState<number | null>(null);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const [endResult,    setEndResult]    = useState<ActivityEndResult | null>(null);
  const [exitModalOpen,setExitModalOpen]= useState(false);
  const [ending,       setEnding]       = useState(false);

  const iframeRef        = useRef<HTMLIFrameElement>(null);
  const containerRef     = useRef<HTMLDivElement>(null);
  const sessionIdRef     = useRef<string | null>(null);
  const heartbeatRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const isEndedRef       = useRef(false);
  const hasStartedRef    = useRef(false);

  // Click tracking refs
  const clickQueueRef  = useRef<ClickEvent[]>([]);
  const clickSeqRef    = useRef(0);
  const clickFlushRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Click flush ──────────────────────────────────────────────────────────────

  const flushClicks = useCallback(async () => {
    if (!sessionIdRef.current || clickQueueRef.current.length === 0) return;
    const batch = clickQueueRef.current.splice(0);
    try {
      await recordClicksBatch(sessionIdRef.current, batch);
    } catch {
      // Discard failed batch — never re-queue so the timer doesn't retry indefinitely
    }
  }, []);

  // ── Receive events via postMessage from the cross-origin iframe ──────────────
  // The backend injects listeners into the simulation HTML that call
  // window.parent.postMessage() for both mousedown and keydown events.

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data) return;
      if (!sessionIdRef.current || isEndedRef.current) return;

      const now = new Date().toISOString();

      if (e.data.type === 'sim_click') {
        clickSeqRef.current += 1;
        clickQueueRef.current.push({
          sequence_no: clickSeqRef.current,
          event_type:  'click',
          x:           e.data.x      ?? null,
          y:           e.data.y      ?? null,
          norm_x:      e.data.norm_x ?? null,
          norm_y:      e.data.norm_y ?? null,
          key_name:    null,
          clicked_at:  e.data.t ?? now,
        });
      } else if (e.data.type === 'sim_key') {
        clickSeqRef.current += 1;
        clickQueueRef.current.push({
          sequence_no: clickSeqRef.current,
          event_type:  'keydown',
          x:           null,
          y:           null,
          norm_x:      null,
          norm_y:      null,
          key_name:    e.data.key ?? null,
          clicked_at:  e.data.t ?? now,
        });
      } else {
        return;
      }

      if (clickQueueRef.current.length >= CLICK_BATCH_SIZE) {
        void flushClicks();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [flushClicks]);

  // ── Load launch info + start session ────────────────────────────────────────

  const loadAndStart = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setElapsed(0);
    isEndedRef.current  = false;
    clickQueueRef.current = [];
    clickSeqRef.current   = 0;

    try {
      let info: ActivityStartResult;

      if (courseId && lessonId) {
        info = await startSimulationActivity(courseId, lessonId);
        sessionIdRef.current = info.sessionId;
      } else {
        const direct = await getSimulationLaunch(simulationId);
        info = {
          sessionId:        '',
          startedAt:        new Date().toISOString(),
          status:           'active',
          launchUrl:        direct.launchUrl,
          simulationId:     direct.simulationId,
          title:            direct.title,
          difficulty:       null,
          estimatedMinutes: null,
          launchType:       direct.launchType ?? null,
          buildStatus:      direct.buildStatus ?? null,
        };
      }

      setLaunchInfo(info);

      if (sessionIdRef.current) {
        heartbeatRef.current = setInterval(() => {
          if (sessionIdRef.current && !isEndedRef.current) {
            sendHeartbeat(sessionIdRef.current).catch(() => {});
          }
        }, HEARTBEAT_INTERVAL_MS);

        clickFlushRef.current = setInterval(() => {
          if (!isEndedRef.current) void flushClicks();
        }, CLICK_FLUSH_INTERVAL_MS);
      }

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);

    } catch (err: unknown) {
      const e = err as { status?: number; title?: string; detail?: string };
      setErrorCode(e.status ?? null);
      setError(e.detail ?? e.title ?? 'Failed to load simulation.');
    } finally {
      setLoading(false);
    }
  }, [simulationId, courseId, lessonId, user, flushClicks]); // flushClicks is stable (no state deps)

  // Guard ensures loadAndStart fires exactly once per mount even if user
  // object identity changes multiple times as the auth context hydrates.
  useEffect(() => {
    if (!user || hasStartedRef.current) return;
    hasStartedRef.current = true;
    loadAndStart();
  }, [user, loadAndStart]);

  // ── Clean up timers on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (heartbeatRef.current)   clearInterval(heartbeatRef.current);
      if (timerRef.current)       clearInterval(timerRef.current);
      if (clickFlushRef.current)  clearInterval(clickFlushRef.current);
    };
  }, []);

  // ── Best-effort end + click flush on page hide ───────────────────────────────
  useEffect(() => {
    const handlePageHide = () => {
      if (sessionIdRef.current && !isEndedRef.current) {
        endActivityBeacon(sessionIdRef.current, 'browser_close');
        flushClicksBeacon(sessionIdRef.current, clickQueueRef.current.splice(0));
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  // ── Fullscreen change ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  // ── Explicit exit ────────────────────────────────────────────────────────────
  const handleExit = async () => {
    if (!sessionIdRef.current || isEndedRef.current) {
      setExitModalOpen(false);
      return;
    }
    setEnding(true);
    const sid          = sessionIdRef.current;
    const elapsedSnap  = elapsed; // snapshot before timers stop

    // Stop all recurring activity synchronously first
    if (heartbeatRef.current)  clearInterval(heartbeatRef.current);
    if (timerRef.current)      clearInterval(timerRef.current);
    if (clickFlushRef.current) clearInterval(clickFlushRef.current);
    isEndedRef.current = true; // prevents new events entering the queue

    // Flush remaining clicks — non-fatal, session must still end
    try { await flushClicks(); } catch { /* discard */ }

    // End session on backend
    let result: ActivityEndResult | null = null;
    try {
      result = await endSimulationActivity(sid, 'user_exit');
    } catch {
      // Network failure or race condition: use client-side elapsed as fallback
    }

    // Always navigate to the completion screen so the user is never stuck
    setEndResult(result ?? ({
      sessionId:         sid,
      status:            'ended',
      exitReason:        'user_exit',
      durationSeconds:   elapsedSnap,
      formattedDuration: formatElapsed(elapsedSnap),
      startedAt:         launchInfo?.startedAt ?? '',
      endedAt:           new Date().toISOString(),
    } as ActivityEndResult));
    setEnding(false);
    setExitModalOpen(false);
  };

  const backHref = courseId ? `/courses/${courseId}/home` : '/simulations';

  // ── States ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (errorCode === 403) {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You are not authorised to launch this simulation."
        extra={<Link href={backHref}><Button type="primary" icon={<ArrowLeftOutlined />}>Go Back</Button></Link>}
      />
    );
  }

  if (errorCode === 400) {
    return (
      <Result
        icon={<ExperimentOutlined style={{ color: '#F59E0B' }} />}
        title="Simulation Not Ready"
        subTitle={error ?? 'The simulation build is not ready yet.'}
        extra={
          <Space>
            <Button onClick={loadAndStart}>Retry</Button>
            <Link href={backHref}><Button icon={<ArrowLeftOutlined />}>Go Back</Button></Link>
          </Space>
        }
      />
    );
  }

  if (error || !launchInfo) {
    return (
      <Result
        status="error"
        title="Launch Failed"
        subTitle={error ?? 'Could not launch the simulation.'}
        extra={
          <Space>
            <Button onClick={loadAndStart}>Retry</Button>
            <Link href={backHref}><Button icon={<ArrowLeftOutlined />}>Go Back</Button></Link>
          </Space>
        }
      />
    );
  }

  // ── Completion modal ──────────────────────────────────────────────────────────

  if (endResult) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - 120px)', gap: 24, padding: '0 24px',
      }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52C41A', fontSize: 64 }} />}
          title="Simulation Session Ended"
          subTitle={`You spent ${endResult.formattedDuration} in this simulation.`}
          extra={
            <Space direction="vertical" align="center" size={16}>
              <Space size={32}>
                <Statistic title="Duration" value={endResult.formattedDuration} />
                <Statistic title="Status"   value={endResult.status.toUpperCase()} />
              </Space>
              <Link href={backHref}>
                <Button type="primary" icon={<ArrowLeftOutlined />} size="large">
                  {courseId ? 'Back to Course' : 'Back to Simulations'}
                </Button>
              </Link>
            </Space>
          }
        />
      </div>
    );
  }

  // ── Player ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#0F172A',
        borderBottom: '1px solid #1E293B', flexShrink: 0, gap: 12,
      }}>
        {/* Left: back + title */}
        <Space size={12} style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <Button
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => setExitModalOpen(true)}
            style={{ background: '#1E293B', border: 'none', color: '#94A3B8', flexShrink: 0 }}
          >
            {courseId ? 'Back to Course' : 'Back'}
          </Button>

          <Space size={6} style={{ minWidth: 0 }}>
            <ExperimentOutlined style={{ color: '#7C3AED', fontSize: 16, flexShrink: 0 }} />
            <Text
              strong
              style={{
                color: '#F1F5F9', fontSize: 14,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {launchInfo.title}
            </Text>
            {launchInfo.difficulty && (
              <Tag color={DIFF_COLOR[launchInfo.difficulty] ?? 'default'} style={{ fontSize: 11, flexShrink: 0 }}>
                {launchInfo.difficulty}
              </Tag>
            )}
            {launchInfo.estimatedMinutes != null && (
              <Tag
                icon={<ClockCircleOutlined />}
                style={{ fontSize: 11, background: '#1E293B', border: 'none', color: '#94A3B8', flexShrink: 0 }}
              >
                {launchInfo.estimatedMinutes} min
              </Tag>
            )}
            {launchInfo.launchType === 'webgl' && (
              <Tag icon={<ThunderboltOutlined />} color="purple" style={{ fontSize: 11, flexShrink: 0 }}>
                Unity WebGL
              </Tag>
            )}
          </Space>
        </Space>

        {/* Right: elapsed timer + controls */}
        <Space size={8} style={{ flexShrink: 0 }}>
          {sessionIdRef.current && (
            <Tag
              icon={<ClockCircleOutlined />}
              style={{ background: '#1E293B', border: 'none', color: '#94A3B8', fontSize: 12 }}
            >
              {formatElapsed(elapsed)}
            </Tag>
          )}

          <Button
            size="small"
            danger
            icon={<LogoutOutlined />}
            onClick={() => setExitModalOpen(true)}
            style={{ flexShrink: 0 }}
          >
            Exit
          </Button>

          <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <Button
              size="small"
              icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{ background: '#1E293B', border: 'none', color: '#94A3B8' }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Tracking notice */}
      {sessionIdRef.current && (
        <Alert
          message="Session in progress — your time and click positions are being recorded."
          type="info"
          showIcon
          closable
          style={{ borderRadius: 0, fontSize: 12, padding: '4px 16px' }}
          banner
        />
      )}

      {/* Unity iframe */}
      <div
        ref={containerRef}
        style={{ flex: 1, background: '#000', position: 'relative', overflow: 'hidden' }}
      >
        <iframe
          ref={iframeRef}
          src={launchInfo.launchUrl}
          title={launchInfo.title}
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
        />
      </div>

      {/* Exit confirmation modal */}
      <Modal
        open={exitModalOpen}
        title="Exit Simulation?"
        onOk={handleExit}
        onCancel={() => setExitModalOpen(false)}
        okText={ending ? 'Ending…' : 'Exit & Record Session'}
        okButtonProps={{ danger: true, loading: ending }}
        cancelText="Keep Playing"
      >
        <p>
          Your session will be ended and the duration recorded.
          Elapsed time: <strong>{formatElapsed(elapsed)}</strong>.
        </p>
        <p style={{ color: '#888', fontSize: 13 }}>
          Your progress inside Unity is not saved by this action.
        </p>
      </Modal>
    </div>
  );
}

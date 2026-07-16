'use client';

/**
 * Public WebGL demo player — mirrors /simulations/[id]/play but uses
 * demoLaunchSimulation (no auth required) for demo_public simulations.
 *
 * Route: /sim/:id/play
 */

import { use, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Button, Spin, Result, Space, Typography, Tag, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, FullscreenOutlined, FullscreenExitOutlined,
  ExperimentOutlined, ClockCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { demoLaunchSimulation } from '@/lib/simulations';
import type { LaunchResult } from '@/lib/simulations';

const { Text } = Typography;

interface Props { params: Promise<{ id: string }> }

const DIFF_COLOR: Record<string, string> = {
  beginner: 'green', intermediate: 'orange', advanced: 'red',
};

export default function PublicSimPlayPage({ params }: Props) {
  const { id: simulationId } = use(params);

  const [launchInfo, setLaunchInfo] = useState<LaunchResult | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [errorCode,  setErrorCode]  = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadLaunchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const info = await demoLaunchSimulation(simulationId);
      setLaunchInfo(info);
    } catch (err: unknown) {
      const e = err as { status?: number; title?: string; detail?: string };
      setErrorCode(e.status ?? null);
      setError(e.detail ?? e.title ?? 'Failed to load simulation.');
    } finally {
      setLoading(false);
    }
  }, [simulationId]);

  useEffect(() => { loadLaunchInfo(); }, [loadLaunchInfo]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const backHref = `/sim/${simulationId}`;

  // -- Loading ------------------------------------------------------------------─

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0F172A' }}>
        <Spin size="large" description="Preparing simulation…" />
      </div>
    );
  }

  // -- Error states --------------------------------------------------------------

  if (errorCode === 403) {
    return (
      <Result
        status="403"
        title="Not Available for Demo"
        subTitle="This simulation is not available for public demo access."
        extra={
          <Link href={backHref}>
            <Button type="primary" icon={<ArrowLeftOutlined />}>Back to Details</Button>
          </Link>
        }
      />
    );
  }

  if (errorCode === 400) {
    return (
      <Result
        icon={<ExperimentOutlined style={{ color: '#F59E0B' }} />}
        title="Simulation Not Ready"
        subTitle={error ?? 'The simulation build is not ready yet. Please try again shortly.'}
        extra={
          <Space>
            <Button onClick={loadLaunchInfo}>Retry</Button>
            <Link href={backHref}>
              <Button icon={<ArrowLeftOutlined />}>Back to Details</Button>
            </Link>
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
            <Button onClick={loadLaunchInfo}>Retry</Button>
            <Link href={backHref}>
              <Button icon={<ArrowLeftOutlined />}>Back to Details</Button>
            </Link>
          </Space>
        }
      />
    );
  }

  // -- Player --------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '8px 16px',
        background:     '#0F172A',
        borderBottom:   '1px solid #1E293B',
        flexShrink:     0,
      }}>
        <Space size={12}>
          <Link href={backHref}>
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              style={{ background: '#1E293B', border: 'none', color: '#94A3B8' }}
            >
              Back
            </Button>
          </Link>

          <Space size={6}>
            <ExperimentOutlined style={{ color: '#7C3AED', fontSize: 16 }} />
            <Text strong style={{ color: '#F1F5F9', fontSize: 14 }}>
              {launchInfo.title}
            </Text>
            {launchInfo.isDemo && (
              <Tag color="success" style={{ fontSize: 11 }}>Demo</Tag>
            )}
            {(launchInfo.launchType === 'webgl' || launchInfo.type === 'webgl') && (
              <Tag icon={<ThunderboltOutlined />} color="purple" style={{ fontSize: 11 }}>
                Unity WebGL
              </Tag>
            )}
          </Space>
        </Space>

        <Tooltip title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          <Button
            size="small"
            icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
            style={{ background: '#1E293B', border: 'none', color: '#94A3B8' }}
          />
        </Tooltip>
      </div>

      {/* iframe container */}
      <div
        ref={containerRef}
        style={{
          flex:       1,
          background: '#000',
          position:   'relative',
          overflow:   'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          src={launchInfo.launchUrl}
          title={launchInfo.title}
          allow="fullscreen; autoplay; clipboard-read; clipboard-write"
          style={{
            width:   '100%',
            height:  '100%',
            border:  'none',
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
        />
      </div>
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircleFilled, VideoCameraOutlined, RocketOutlined } from '@ant-design/icons';
import type { PageContentItem, DemoExtra } from '@/lib/pageContent';
import { colors, sectionContainerStyle, headingStyle, bodyTextStyle } from './homeTheme';

const DEFAULT_DEMO_VIDEO = '/simulation_tour.mp4';

interface Props {
  demo: PageContentItem | null;
}

export default function DemoSection({ demo }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!demo) return null;

  const extra = (demo.extra as DemoExtra) ?? {};
  const title = demo.title ?? 'See SimuLearn in Action';
  const description = demo.description
    ?? 'Explore BEDO lab experiences through interactive 3D simulations designed to help learners visualize, practice, and understand complex lab concepts online.';
  const watchLabel = extra.watchButtonLabel ?? 'Watch Demo';
  const launchLabel = extra.launchButtonLabel ?? 'Launch Sample Simulation';
  const videoUrl = extra.videoUrl || DEFAULT_DEMO_VIDEO;

  function handlePlay() {
    const video = videoRef.current;
    if (!video) return;
    setPlaying(true);
    video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void video.play();
  }

  function handleLaunchSample() {
    if (extra.sampleSimulationId) {
      router.push(`/sim/${extra.sampleSimulationId}`);
    } else {
      router.push('/public-catalog?scope=demo');
    }
  }

  return (
    <section aria-label="Product demo">
      <div style={sectionContainerStyle}>
        <div
          className="home-hero-grid"
          style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48, alignItems: 'center' }}
        >
          <div>
            <h2 style={{ ...headingStyle }}>{title}</h2>
            <p style={{ ...bodyTextStyle, marginBottom: 28 }}>{description}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePlay}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: colors.primary, color: '#fff', border: 'none',
                  borderRadius: 10, padding: '13px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <VideoCameraOutlined /> {watchLabel}
              </button>
              <button
                type="button"
                onClick={handleLaunchSample}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#fff', color: 'black', border: '1px solid black',
                  borderRadius: 10, padding: '13px 22px', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <RocketOutlined /> {launchLabel}
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={extra.thumbnailUrl ? videoUrl : `${videoUrl}#t=0.1`}
              poster={extra.thumbnailUrl ?? undefined}
              controls={playing}
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              style={{
                display: 'block', width: '100%', aspectRatio: '16 / 9',
                objectFit: 'cover', borderRadius: 16, background: '#000',
              }}
            />
            {!playing && (
              <button
                type="button"
                onClick={handlePlay}
                aria-label="Play demo video"
                style={{
                  position: 'absolute', inset: 0, borderRadius: 16, border: 'none', padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(65,108,130,0.18)', cursor: 'pointer',
                }}
              >
                <span style={{
                  width: 72, height: 72, borderRadius: '50%', background: colors.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(242,139,54,0.4)',
                }}>
                  <PlayCircleFilled style={{ fontSize: 32, color: '#fff' }} />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from 'antd';
import { PlayCircleFilled, VideoCameraOutlined, RocketOutlined } from '@ant-design/icons';
import type { PageContentItem, DemoExtra } from '@/lib/pageContent';
import { colors, sectionContainerStyle, headingStyle, bodyTextStyle } from './homeTheme';
import PlaceholderPanel from './PlaceholderPanel';

interface Props {
  demo: PageContentItem | null;
}

export default function DemoSection({ demo }: Props) {
  const router = useRouter();
  const [videoOpen, setVideoOpen] = useState(false);

  if (!demo) return null;

  const extra = (demo.extra as DemoExtra) ?? {};
  const title = demo.title ?? 'See SimuLearn in Action';
  const description = demo.description
    ?? 'Explore BEDO lab experiences through interactive 3D simulations designed to help learners visualize, practice, and understand complex lab concepts online.';
  const watchLabel = extra.watchButtonLabel ?? 'Watch Demo';
  const launchLabel = extra.launchButtonLabel ?? 'Launch Sample Simulation';
  const hasVideo = Boolean(extra.videoUrl);

  function handleLaunchSample() {
    if (extra.sampleSimulationId) {
      router.push(`/sim/${extra.sampleSimulationId}`);
    } else {
      router.push('/public-catalog?scope=demo');
    }
  }

  return (
    <section style={{  }} aria-label="Product demo">
      <div style={sectionContainerStyle}>
        <div
          className="home-hero-grid"
          style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48, alignItems: 'center' }}
        >
          <div>
            <h2 style={{ ...headingStyle}}>{title}</h2>
            <p style={{ ...bodyTextStyle, marginBottom: 28 }}>{description}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!hasVideo}
                onClick={() => setVideoOpen(true)}
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
                  background: '#fff', color: 'black', border: `1px solid black`,
                  borderRadius: 10, padding: '13px 22px', fontSize: 15, fontWeight: 700,
                  cursor: hasVideo ? 'pointer' : 'not-allowed', opacity: hasVideo ? 1 : 0.5,
                }}
                
              >
                <RocketOutlined /> {launchLabel}
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => hasVideo && setVideoOpen(true)}
              aria-label={hasVideo ? 'Play demo video' : 'Demo video preview'}
              style={{
                display: 'block', width: '100%', border: 'none', padding: 0,
                cursor: hasVideo ? 'pointer' : 'default', position: 'relative',
              }}
            >
              <PlaceholderPanel
                src={extra.thumbnailUrl}
                alt="SimuLearn demo preview"
                aspectRatio="16 / 9"
                borderRadius={16}
                icon={<VideoCameraOutlined style={{ fontSize: 48, color: colors.accent, opacity: 0.45 }} />}
              />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0, borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(65,108,130,0.18)',
                }}
              >
                <span style={{
                  width: 72, height: 72, borderRadius: '50%', background: colors.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(242,139,54,0.4)',
                }}>
                  <PlayCircleFilled style={{ fontSize: 32, color: '#fff' }} />
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={videoOpen}
        onCancel={() => setVideoOpen(false)}
        footer={null}
        width={860}
        destroyOnHidden
        title={title}
      >
        {extra.videoUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={extra.videoUrl}
            controls
            autoPlay
            style={{ width: '100%', borderRadius: 8 }}
          />
        )}
      </Modal>
    </section>
  );
}

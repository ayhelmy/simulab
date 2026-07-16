'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton, Layout } from 'antd';
import {
  ArrowLeftOutlined, ClockCircleOutlined, ExperimentOutlined,
  PlayCircleOutlined, LockOutlined, CheckCircleFilled,
  ThunderboltOutlined, TrophyOutlined, BookOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { getSimulation } from '@/lib/simulations';
import PublicHeader from '@/components/public/PublicHeader';
import type { Simulation } from '@/types';
import
{
  heroWrapStyle, heroBgStyle, heroBgImgStyle, heroOverlayStyle,
  heroGrainStyle, heroContentStyle, heroThumbStyle, heroThumbShineStyle,
  backBtnStyle, ghostBtnStyle, heroTitleStyle, heroBadgeStyle, heroTagRowStyle,
  metaChipStyle, heroPrimaryBtnStyle, bodyGridStyle, sectionCardStyle,
  sectionTitleStyle, asideStyle, ctaCardStyle, ctaThumbStyle,
  ctaHeadStyle, ctaSubStyle, ctaPrimaryBtnStyle, ctaSecondaryBtnStyle,
} from './page_style';
// ── constants ─────────────────────────────────────────────────────────────────

const DIFF: Record<string, { label: string; color: string; bg: string }> = {
  beginner:     { label: 'Beginner',     color: '#16a34a', bg: 'rgba(22,163,74,.12)'  },
  intermediate: { label: 'Intermediate', color: '#5C98B7', bg: 'rgba(92,152,183,.12)' },
  advanced:     { label: 'Advanced',     color: '#dc2626', bg: 'rgba(220,38,38,.12)'  },
};

// ── detail chip sub-component ─────────────────────────────────────────────────

function DetailChip({ icon, label, value, chipColor, chipBg }: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  chipColor?: string;
  chipBg?: string;
}) {
  return (
    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
      <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon}
        {label}
      </span>
      {chipColor ? (
        <span style={{ background: chipBg, color: chipColor, fontWeight: 700, fontSize: 13, padding: '2px 8px', borderRadius: 6 }}>
          {value}
        </span>
      ) : (
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{value}</span>
      )}
    </div>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#0A0F1E' }}>
      <div style={{ height: 420, background: 'linear-gradient(160deg,#0A0F1E 0%,#0d1b3e 100%)', padding: '40px 5%' }}>
        <Skeleton active title={{ width: 120 }} paragraph={false} style={{ filter: 'brightness(0.5)' }} />
        <div style={{ marginTop: 32 }}>
          <Skeleton.Button active style={{ width: 80, height: 24, borderRadius: 20, marginBottom: 16 }} />
          <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 2, width: ['70%', '45%'] }}
            style={{ filter: 'brightness(0.4)' }} />
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 5%', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function SimDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!user;

  const [sim,     setSim]     = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getSimulation(id)
      .then((s) => { setSim(s); setTimeout(() => setVisible(true), 60);

        console.log('Simulation loaded:', s);
       })
      .catch((err) => setError(err?.title ?? err?.message ?? 'Simulation not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const isDemo = sim?.visibility === 'demo_public' || sim?.visibility === 'demo_and_institution';
  const diff   = DIFF[sim?.difficulty ?? 'intermediate'] ?? DIFF.intermediate;

  if (loading) return (
    <Layout >
      <PublicHeader />
      <PageSkeleton />
    </Layout>
  );

  if (error || !sim) return (
    <Layout style={{ background: '#0A0F1E', minHeight: '100vh' }}>
      <PublicHeader />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <ExperimentOutlined style={{ fontSize: 56, color: 'rgba(255,255,255,.2)' }} />
        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 16, margin: 0 }}>
          {error ?? 'Simulation not found.'}
        </p>
        <button onClick={() => router.push('/')} style={ghostBtnStyle}>
          Browse Catalog
        </button>
      </div>
    </Layout>
  );

  return (
    <Layout style={{  minHeight: '100vh' }}>
      <PublicHeader />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div style={heroWrapStyle}>
     
        <div style={{...heroBgStyle ,backgroundImage: `url(${sim.thumbnailUrl}) `,filter: 'blur(10px)'}} />
        {sim.thumbnailUrl && (
          <div style={{ ...heroBgImgStyle, backgroundImage: `url(${sim.thumbnailUrl})` }} />
        )}
        <div  />

        {/* noise grain */}
        <div style={heroGrainStyle} />

        <div style={{ ...heroContentStyle, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(18px)', transition: 'opacity .55s ease, transform .55s ease' }}>

          {/* back */}
          <button onClick={() => router.back()} style={backBtnStyle} className="sim-hero-back">
            <ArrowLeftOutlined style={{ marginRight: 6 }} />
            Back
          </button>


          {/* title */}
          <h1 style={{ ...heroTitleStyle, animationDelay: '.1s', color:'black'}} className="sim-anim-up">
            {sim.title}
          {/* demo badge */}
          {isDemo && (
            <span style={{ ...heroBadgeStyle, animationDelay: '.05s' }} className="sim-anim-up">
              ✦ Public Demo
            </span>
          )}
          </h1>

          {/* tag row */}
          <div style={{ ...heroTagRowStyle, animationDelay: '.18s' }} className="sim-anim-up">
            <span style={{ ...metaChipStyle, background: diff.bg, color: diff.color }}>
              <TrophyOutlined style={{ marginRight: 4 }} />
              {diff.label}
            </span>
            {sim.estimatedMinutes && (
              <span style={metaChipStyle}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {sim.estimatedMinutes} min
              </span>
            )}
            {(sim.launchType === 'webgl' || sim.type === 'webgl') && (
              <span style={{ ...metaChipStyle, background: 'rgba(138, 92, 246, 0.38)', color: '#e6e6e6' }}>
                <ThunderboltOutlined style={{ marginRight: 4 }} />
                Unity WebGL
              </span>
            )}
            {sim.type && sim.launchType !== sim.type && (
              <span style={metaChipStyle}>
                <BookOutlined style={{ marginRight: 4 }} />
                {sim.type.toUpperCase()}
              </span>
            )}
          </div>

          {/* hero CTA (demo only — keeps hero interactive) */}
          {isDemo && (
            <div style={{ marginTop: 28, animationDelay: '.26s' }} className="sim-anim-up">
              <button
                style={heroPrimaryBtnStyle}
                className="sim-hero-play-btn"
                onClick={() => router.push(`/sim/${sim.id}/play`)}
              >
                <PlayCircleOutlined style={{ fontSize: 18, marginRight: 8 }} />
                Launch Simulation
              </button>
            </div>
          )}
        </div>

        {/* floating thumbnail
        {sim.thumbnailUrl && (
          <div
            style={{ ...heroThumbStyle, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateX(28px)', transition: 'opacity .6s ease .15s, transform .6s ease .15s' }}
            className="sim-hero-thumb"
          >
            <img src={sim.thumbnailUrl} alt={sim.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={heroThumbShineStyle} />
          </div>
        )} */}
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div style={bodyGridStyle} className="sim-body-grid">

        {/* LEFT: content */}
        <main style={{ minWidth: 0 }}>

          {/* Description */}
          {sim.description && (
            <section style={{ ...sectionCardStyle, animationDelay: '.12s' }} className="sim-anim-up">
              <h2 style={sectionTitleStyle}>About this Simulation</h2>
              <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                {sim.description}
              </p>
            </section>
          )}

          {/* Learning objectives */}
          {(sim.learningObjectives?.length ?? 0) > 0 && sim.learningObjectives && (
            <section style={{ ...sectionCardStyle, animationDelay: '.2s' }} className="sim-anim-up">
              <h2 style={sectionTitleStyle}>Learning Objectives</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sim.learningObjectives.map((obj, i) => (
                  <li
                    key={i}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, animationDelay: `${.22 + i * .06}s` }}
                    className="sim-anim-up"
                  >
                    <CheckCircleFilled style={{ color: '#F59324', fontSize: 16, marginTop: 2, flexShrink: 0 }} />
                    <span style={{ color: '#374151', fontSize: 14, lineHeight: 1.6 }}>{obj}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Details */}
          <section style={{ ...sectionCardStyle, animationDelay: '.28s' }} className="sim-anim-up">
            <h2 style={sectionTitleStyle}>Simulation Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              <DetailChip icon={<BookOutlined />} label="Type" value={sim.type.toUpperCase()} />
              <DetailChip icon={<TrophyOutlined />} label="Difficulty" value={diff.label} chipColor={diff.color} chipBg={diff.bg} />
              {sim.estimatedMinutes != null && (
                <DetailChip icon={<ClockCircleOutlined />} label="Duration" value={`${sim.estimatedMinutes} min`} />
              )}
              {sim.version && <DetailChip label="Version" value={`v${sim.version}`} />}
              {sim.maxScore ? <DetailChip label="Max score" value={String(sim.maxScore)} /> : null}
              {sim.maxAttempts ? <DetailChip label="Attempts" value={String(sim.maxAttempts)} /> : null}
            </div>
          </section>
        </main>

        {/* RIGHT: CTA */}
        <aside style={asideStyle} className="sim-aside">
          <div style={{ ...ctaCardStyle, animationDelay: '.22s' }} className="sim-anim-up">

            {/* thumb inside card (if no hero thumb shown on mobile) */}
            {sim.thumbnailUrl && (
              <div style={ctaThumbStyle} className="sim-cta-thumb">
                <img src={sim.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {isDemo ? (
              <>
                <p style={ctaHeadStyle}>Ready to explore?</p>
                <p style={ctaSubStyle}>
                  No account needed. Launch the interactive simulation directly in your browser.
                </p>
                <button
                  style={ctaPrimaryBtnStyle}
                  className="sim-cta-play-btn"
                  onClick={() => router.push(`/sim/${sim.id}/play`)}
                >
                  <PlayCircleOutlined style={{ fontSize: 17, marginRight: 8 }} />
                  Start Demo
                </button>
                {!isAuthenticated && (
                  <button style={ctaSecondaryBtnStyle} className="sim-cta-secondary-btn" onClick={() => router.push('/register')}>
                    Create Free Account
                  </button>
                )}
              </>
            ) : isAuthenticated ? (
              <>
                <p style={ctaHeadStyle}>Institution access</p>
                <p style={ctaSubStyle}>
                  This simulation is available through your institution's course catalog.
                </p>
                <button style={ctaPrimaryBtnStyle} className="sim-cta-play-btn" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <p style={ctaHeadStyle}>Sign in to access</p>
                <p style={ctaSubStyle}>
                  This simulation is available to students through their institution.
                </p>
                <button
                  style={ctaPrimaryBtnStyle}
                  className="sim-cta-play-btn"
                  onClick={() => router.push(`/login?next=${encodeURIComponent(`/sim/${sim.id}`)}`)}
                >
                  <LockOutlined style={{ marginRight: 8 }} />
                  Log In
                </button>
                <button style={ctaSecondaryBtnStyle} className="sim-cta-secondary-btn" onClick={() => router.push('/register')}>
                  Create Account
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* scoped styles */}
      <style>{`
        @keyframes simFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sim-anim-up {
          animation: simFadeUp .5s ease both;
        }
        .sim-hero-back {
          transition: color .15s, background .15s;
        }
        .sim-hero-back:hover {
          // color: #fff !important;
          // background: rgba(255,255,255,.12) !important;
        }
        .sim-hero-play-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 40px rgba(245,147,36,.55) !important;
        }
        .sim-hero-thumb {
          filter: drop-shadow(0 24px 48px rgba(0,0,0,.5));
        }
        .sim-cta-play-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(245,147,36,.45) !important;
        }
        .sim-cta-secondary-btn:hover {
          background: #F3F4F6 !important;
          border-color: #9CA3AF !important;
        }
        @media (max-width: 900px) {
          // .sim-body-grid {
          //   grid-template-columns: 1fr !important;
          // }
          .sim-aside {
            position: static !important;
            order: -1;
          }
          .sim-hero-thumb {
            display: none !important;
          }
        }
        @media (max-width: 600px) {
          .sim-cta-thumb {
            height: 160px !important;
          }
        }
      `}</style>
    </Layout>
  );
}


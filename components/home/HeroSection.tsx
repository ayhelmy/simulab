'use client';

import { useRouter } from 'next/navigation';
import { ArrowRightOutlined, PlayCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { PageContentItem, HeroExtra } from '@/lib/pageContent';
import { colors } from './homeTheme';

interface Props {
  hero: PageContentItem | null;
}

const DEFAULT_BADGES: { value: string; label: string }[] = [
  { value: '19+',      label: 'Simulations' },
  { value: 'ENG & CS', label: 'Disciplines' },
  { value: 'WebGL',    label: 'Browser-based' },
  { value: 'LTI Ready', label: 'LMS Integration' },
];

export default function HeroSection({ hero }: Props) {
  const router = useRouter();

  const extra = (hero?.extra as HeroExtra) ?? {};
  const title = hero?.title ?? 'Explore BEDO Interactive 3D Simulations';
  const highlighted = 'Interactive 3D Simulations';
  const description = hero?.description
    ?? 'Access browser-based interactive 3D simulations for engineering and computer science labs. Preview simulations online, explore learning objectives, and support institutional access through LMS/LTI integration.';
  const badgeText =  'BEDO Interactive 3D Simulation';
  const primaryLabel = extra.primaryButtonLabel ?? hero?.ctaText ?? 'Explore Simulations';
  const primaryUrl = extra.primaryButtonUrl ?? '/public-catalog';
  const secondaryLabel = extra.secondaryButtonLabel ?? 'Try Demo';
  const secondaryUrl = extra.secondaryButtonUrl ?? '/public-catalog?scope=demo';
  const heroImageUrl = extra.heroImageUrl ?? '/images/herobg.png';
  const badges = extra.badges?.length ? extra.badges : DEFAULT_BADGES;

  function renderTitle() {
    if (!highlighted || !title.includes(highlighted)) return title;
    const [before, after] = title.split(highlighted);
    console.log('renderTitle', { title, highlighted, before, after });
    const before_parts = before.split(' ');
    return (
      <>
      <>
     { before_parts[0]}
      </><br></br>
      {before_parts.slice(1).join(' ')}<span style={{ color: colors.primary }}>{ highlighted}</span>{after}
      </>
    );
  }

  return (
    <section
      aria-label="Hero"
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 560,
        display: 'flex',
        alignItems: 'center',
        background: heroImageUrl
          ? `center / cover no-repeat url(${heroImageUrl})`
          : `linear-gradient(120deg, ${colors.bgMuted} 0%, ${colors.bgAlt} 100%)`,
      }}
    >
      {!heroImageUrl && (
        <ExperimentOutlined
          aria-hidden="true"
          style={{
            position: 'absolute', right: '4%', top: '50%', transform: 'translateY(-50%)',
            fontSize: 220, color: colors.accent, opacity: 0.18,
          }}
        />
      )}

      {/* Light wash — strong over the copy on the left, fading out toward the photo on the right */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          // background: `linear-gradient(90deg, ${colors.bg} 0%, rgba(249,249,249,0.88) 30%, rgba(249,249,249,0.55) 55%, rgba(249,249,249,0.15) 80%)`,
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1160, margin: '0 50px', padding: '48px 24px 64px' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
             border: `1px solid white`,
            borderRadius: 999, padding: '6px 14px', marginBottom: 22,
            fontSize: 12.5, fontWeight: 600, color: colors.accent,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors.accent, flexShrink: 0 }} />
          {badgeText}
        </span>

        <h1
          className="home-hero-heading"
          style={{ fontSize: 60, fontWeight: 900, lineHeight: '63px', color: colors.heading, margin: '0 0 20px', maxWidth: 640 }}
        >
          {renderTitle()}
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.7, color: '#2C333D', maxWidth: 480, margin: '0 0 30px' }}>
          {description}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => router.push(primaryUrl)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: colors.primary, color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {primaryLabel} <ArrowRightOutlined />
          </button>
          <button
            type="button"
            onClick={() => router.push(secondaryUrl)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', color: colors.heading, border: `1px solid ${colors.border}`,
              borderRadius: 10, padding: '13px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <PlayCircleOutlined /> {secondaryLabel}
          </button>
        </div>

        <div className="home-hero-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: 12  }}>
          {badges.map((b) => (
            <div
              key={b.label}
              style={{
               border: `1px solid ${colors.border}`,
                borderRadius: 10, padding: '12px 18px', minWidth: 118,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.accent, lineHeight: 1.3 , textAlign: 'center' }}>{b.value}</div>
              <div style={{ fontSize: 12, color: colors.body, lineHeight: 1.3 , textAlign: 'center' }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

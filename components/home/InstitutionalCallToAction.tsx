'use client';

import { useRouter } from 'next/navigation';
import type { PageContentItem, CtaExtra } from '@/lib/pageContent';
import { colors } from './homeTheme';

interface Props {
  cta: PageContentItem | null;
}

export default function InstitutionalCallToAction({ cta }: Props) {
  const router = useRouter();
  if (!cta) return null;

  const extra = (cta.extra as CtaExtra) ?? {};
  const primaryLabel = extra.primaryButtonLabel ?? 'Explore Simulations';
  const primaryUrl = extra.primaryButtonUrl ?? '/public-catalog';
  const secondaryLabel = extra.secondaryButtonLabel ?? 'Book Demo';
  const secondaryUrl = extra.secondaryButtonUrl ?? '/register';

  return (
    <section
      aria-label="Institutional call to action"
      style={{
        position: 'relative',
        padding: '84px 24px',
        textAlign: 'center',
        width: '90%',
        overflow: 'hidden',
        margin: '70px auto',
        borderRadius: 16,
        background: extra.backgroundImageUrl??'/images/institutionhero.png'
          ? `linear-gradient(rgba(65, 108, 130, 0.75), rgba(65, 108, 130, 0.84)), center / cover no-repeat url(${'/images/institutionhero.png'})`
          : `linear-gradient(135deg, ${colors.secondary} 0%, #2f4e5e 100%)`,
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 32, margin: '0 0 16px' }}>
          {cta.title}
        </h2>
        {cta.description && (
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 32 }}>
            {cta.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push(primaryUrl)}
            style={{
              background: colors.primary, color: '#fff', border: 'none',
              borderRadius: 10, padding: '13px 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {primaryLabel}
          </button>
          {secondaryLabel && (
            <button
              type="button"
              onClick={() => router.push(secondaryUrl)}
              style={{
                background: 'white', color: '#000', border: '1px solid rgba(255,255,255,0.6)',
                borderRadius: 10, padding: '13px 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

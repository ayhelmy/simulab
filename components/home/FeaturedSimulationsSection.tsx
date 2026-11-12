'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Empty, Button, Skeleton } from 'antd';
import type { PageContentItem, FeaturedSimulationCard } from '@/lib/pageContent';
import { listDemoSimulationsPaginated } from '@/lib/simulations';
import { colors, sectionContainerStyle, headingStyle, bodyTextStyle, linkStyle, cardStyle } from './homeTheme';
import FeaturedSimCard from './FeaturedSimCard';

const CARD_COUNT = 3;

interface Props {
  intro: PageContentItem | null;
  items: FeaturedSimulationCard[];
}

/**
 * The home-page payload carries no featured items when none are curated yet,
 * or when the backend was unreachable and HOME_PAGE_FALLBACK was used. Rather
 * than an empty section, pull public demo simulations from the same endpoint
 * the public catalog uses — admin-flagged ones first, in their featured order.
 */
async function loadDemoFallback(): Promise<FeaturedSimulationCard[]> {
  const { simulations } = await listDemoSimulationsPaginated({ page: 1, limit: 12 });
  const ranked = [...simulations].sort((a, b) => {
    if (!!a.isFeatured !== !!b.isFeatured) return a.isFeatured ? -1 : 1;
    return (a.featuredOrder ?? Infinity) - (b.featuredOrder ?? Infinity);
  });
  return ranked.slice(0, CARD_COUNT).map((sim) => ({ ...sim, discipline: null }));
}

export default function FeaturedSimulationsSection({ intro, items }: Props) {
  const router = useRouter();
  const linkUrl = (intro?.extra as { linkUrl?: string } | undefined)?.linkUrl ?? '/public-catalog';

  // null = still loading the fallback; only used when the payload had no items.
  const [fallback, setFallback] = useState<FeaturedSimulationCard[] | null>(null);
  const needsFallback = items.length === 0;

  useEffect(() => {
    if (!needsFallback) return;
    let cancelled = false;
    loadDemoFallback()
      .then((sims) => { if (!cancelled) setFallback(sims); })
      .catch(() => { if (!cancelled) setFallback([]); });
    return () => { cancelled = true; };
  }, [needsFallback]);

  const shown = needsFallback ? fallback : items;

  return (
    <section style={{ background: colors.bgAlt }} aria-label="Featured simulations">
      <div style={sectionContainerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <div>
            <h2 style={{ ...headingStyle }}>
              {intro?.title ?? 'Start Exploring BEDO Interactive 3D Simulations'}
            </h2>
            {intro?.description && (
              <p style={{ ...bodyTextStyle, margin: 0 }}>{intro.description}</p>
            )}
          </div>
          {intro?.ctaText && (
            <a href={linkUrl} onClick={(e) => { e.preventDefault(); router.push(linkUrl); }} style={linkStyle}>
              {intro.ctaText} →
            </a>
          )}
        </div>

        {shown === null ? (
          <div className="home-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} aria-busy="true">
            {Array.from({ length: CARD_COUNT }, (_, i) => (
              <div key={i} style={{ ...cardStyle, padding: 16 }}>
                <Skeleton.Image active style={{ width: '100%', height: 160 }} />
                <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 16 }} />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Empty
            description="No featured simulations yet — check back soon, or browse the full catalog."
            style={{ padding: '48px 0' }}
          >
            <Button type="primary" onClick={() => router.push('/public-catalog')}>
              Browse Full Catalog
            </Button>
          </Empty>
        ) : (
          <div className="home-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {shown.map((sim) => (
              <FeaturedSimCard key={sim.id} sim={sim} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

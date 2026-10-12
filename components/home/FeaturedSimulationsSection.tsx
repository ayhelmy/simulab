'use client';

import { useRouter } from 'next/navigation';
import { Empty, Button } from 'antd';
import type { PageContentItem, FeaturedSimulationCard } from '@/lib/pageContent';
import { colors, sectionContainerStyle, headingStyle, bodyTextStyle, linkStyle } from './homeTheme';
import FeaturedSimCard from './FeaturedSimCard';

interface Props {
  intro: PageContentItem | null;
  items: FeaturedSimulationCard[];
}

export default function FeaturedSimulationsSection({ intro, items }: Props) {
  const router = useRouter();
  const linkUrl = (intro?.extra as { linkUrl?: string } | undefined)?.linkUrl ?? '/public-catalog';

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

        {items.length === 0 ? (
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
            {items.map((sim) => (
              <FeaturedSimCard key={sim.id} sim={sim} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

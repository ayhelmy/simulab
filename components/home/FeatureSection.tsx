'use client';

import { useRouter } from 'next/navigation';
import { resolveIcon } from '@/lib/iconMap';
import type { PageContentItem } from '@/lib/pageContent';
import { colors, sectionContainerStyle, headingStyle, bodyTextStyle, cardStyle, linkStyle, tint, ICON_TILE_COLORS } from './homeTheme';

interface Props {
  intro: PageContentItem | null;
  cards: PageContentItem[];
}

export default function FeatureSection({ intro, cards }: Props) {
  const router = useRouter();
  if (!cards.length && !intro) return null;

  const linkUrl = (intro?.extra as { linkUrl?: string } | undefined)?.linkUrl ?? '/why-simlearn';

  return (
    <section style={{  }} aria-label="Features">
      <div style={sectionContainerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 40 }}>
          <div>
            <h2 style={{ ...headingStyle, fontSize: 36  }}>
              {intro?.title ?? 'Built for practical, interactive learning'}
            </h2>
            {intro?.description && (
              <p style={{ ...bodyTextStyle, margin: 0 }}>{intro.description}</p>
            )}
          </div>
          {intro?.ctaText && (
            <a href={linkUrl} onClick={(e) => { e.preventDefault(); router.push(linkUrl); }} style={linkStyle} >
              {intro.ctaText} →
            </a>
          )}
        </div>

        <div className="home-card-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {cards.map((card, i) => {
            const tileColor = ICON_TILE_COLORS[i % ICON_TILE_COLORS.length];
            return (
              <div key={card.id} style={{ ...cardStyle, padding: '26px 22px', width: '95%', backgroundColor:colors.bgAlt }}>
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 10, marginBottom: 16,
                    background: tint(tileColor, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {resolveIcon(card.iconName, tileColor, 24)}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.heading, margin: '0 0 8px' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 14, color: colors.body, margin: 0, lineHeight: 1.6 }}>
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

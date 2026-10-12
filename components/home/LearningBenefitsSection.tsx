'use client';

import { resolveIcon } from '@/lib/iconMap';
import type { PageContentItem } from '@/lib/pageContent';
import { colors, sectionContainerStyle, headingStyle, cardStyle, tint, ICON_TILE_COLORS, bodyTextStyle } from './homeTheme';
import PlaceholderPanel from './PlaceholderPanel';

interface Props {
  intro: PageContentItem | null;
  cards: PageContentItem[];
}

export default function LearningBenefitsSection({ intro, cards }: Props) {
  if (!cards.length && !intro) return null;

  const imageUrl = (intro?.extra as { imageUrl?: string | null } | undefined)?.imageUrl;

  return (
    <section style={{ }} aria-label="Learning benefits">
      <div style={sectionContainerStyle}>
        <h2 style={{ ...headingStyle}}>
          {intro?.title ?? 'Built for practical, interactive learning'}
        </h2>

          <p style={{ color: '#595E66', fontSize: 16, marginBottom: 32 , ...bodyTextStyle}}>
            {intro?.ctaText?? 'Designed to help learners explore technical concepts through interactive 3D environments.'}
          </p>
     
        <div
          className="home-benefits-grid"
          style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 40, alignItems: 'center' }}
        >
          <PlaceholderPanel
            src={imageUrl??'/images/learning-benefits.png'}
            alt="Learners exploring an interactive 3D simulation"
            aspectRatio="4 / 3"
            borderRadius={16}
          />

          <div className="home-card-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {cards.map((card, i) => {
              const tileColor = ICON_TILE_COLORS[i % ICON_TILE_COLORS.length];
              return (
                <div key={card.id} style={{ ...cardStyle, padding: '20px 20px 18px' , backgroundColor:colors.bgAlt}}>
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 8, marginBottom: 12,
                      background: tint(tileColor, 0.12),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {resolveIcon(card.iconName, tileColor, 19)}
                  </div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: colors.heading, margin: '0 0 6px' }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 13, color: colors.body, margin: '0 0 12px', lineHeight: 1.6 }}>
                    {card.description}
                  </p>
                  <span style={{ display: 'block', width: 26, height: 3, borderRadius: 2, background: tileColor }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

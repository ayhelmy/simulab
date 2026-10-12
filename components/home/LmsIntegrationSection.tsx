'use client';

import { useRouter } from 'next/navigation';
import { resolveIcon } from '@/lib/iconMap';
import type { PageContentItem } from '@/lib/pageContent';
import { colors, sectionContainerStyle, headingStyle, cardStyle, linkStyle,tint, ICON_TILE_COLORS, bodyTextStyle } from './homeTheme';
import { space } from 'postcss/lib/list';

interface Props {
  intro: PageContentItem | null;
  cards: PageContentItem[];
}

export default function LmsIntegrationSection({ intro, cards }: Props) {
  const router = useRouter();
  if (!cards.length && !intro) return null;

  const linkUrl = (intro?.extra as { linkUrl?: string } | undefined)?.linkUrl ?? '/lti-info';

  return (
    <section style={{ background: colors.bgAlt }} aria-label="LMS and LTI integration">
      <div style={sectionContainerStyle}>
        {/* <div style={{ textAlign: 'center', marginBottom: 40 }}> */}
          <h2 style={{ ...headingStyle }}>
            {intro?.title ?? 'Ready for Your LMS'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'row',justifyContent:'space-between',marginTop:0 }}>

          {intro?.description && (
            <p style={{ ...bodyTextStyle, maxWidth: 640, }}>{intro.description}</p>
          )}
          {intro?.ctaText && (
            <a
              href={linkUrl}
              onClick={(e) => { e.preventDefault(); router.push(linkUrl); }}
              style={{ ...linkStyle, display: 'inline-block', marginTop: 8 }}
            >
              {intro.ctaText} →
            </a>
          )}
          </div>
        {/* </div> */}

        <div className="home-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {cards.map((card, i) => {
            const tileColor = ICON_TILE_COLORS[i % ICON_TILE_COLORS.length];
            return (
              <div
                key={card.id}
                style={{
                  background: '#E3E6E9', border: `1px solid ${colors.border}`, borderRadius: 14,
                  padding: '30px 24px'
                }}
              >
                <div
                  style={{
                    width: 52, height: 52, borderRadius: 12, marginBottom: 16,
                    background: tint(tileColor, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {resolveIcon(card.iconName, tileColor, 26)}
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

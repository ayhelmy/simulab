'use client';

import { colors } from '@/components/home/homeTheme';
import PlaceholderPanel from '@/components/home/PlaceholderPanel';

export interface GalleryItem { title: string; thumbnailUrl?: string | null }

interface Props {
  items: GalleryItem[];
}

function Tile({ item, aspectRatio }: { item: GalleryItem; aspectRatio: string }) {
  return (
  <div
  style={{
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  }}
>
  <PlaceholderPanel
    src={item.thumbnailUrl}
    alt={item.title}
    aspectRatio={aspectRatio}
    borderRadius={14}
  />

  {/* Gradient Overlay */}
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background:
       ' linear-gradient( 180deg, rgba(13, 17, 23, 0.38) 0%,  rgba(13,17,23,0) 60%)',
      borderRadius: 14,
    }}
  />

  <span
    style={{
      position: 'absolute',
      left: 10,
      top: 10,
      maxWidth: 'calc(100% - 20px)',
      color: '#fff',
      fontSize: 16,
      fontWeight: 600,
      borderRadius: 8,
      padding: '5px 10px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      zIndex: 1,
    }}
  >
    {item.title}
  </span>
</div>
  );
}

export default function GallerySection({ items }: Props) {
  if (!items.length) return null;
  const [main, ...rest] = items;
  const small = rest.slice(0, 4);

  return (
    <section style={{ background: colors.bg }} aria-label="A closer look at BEDO Interactive 3D Simulation">
      <div style={{  padding: '28px 100px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: colors.heading, margin: '0 0 10px' }}>
            A Closer Look at BEDO Interactive 3D Simulation
          </h2>
          <p style={{ fontSize: 14.5, color: colors.body, maxWidth: 560, margin: '0 auto' }}>
            A few glimpses of what learners and instructors experience inside the platform.
          </p>
        </div>

        <div className="about-gallery-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 16 }}>
          <Tile item={main} aspectRatio="16/ 9" />
          {small.length > 0 && (
            <div className="about-gallery-small-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {small.map((item) => (
                <Tile key={item.title} item={item} aspectRatio="16/9" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

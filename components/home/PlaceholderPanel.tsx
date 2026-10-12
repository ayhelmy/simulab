'use client';

import { PictureOutlined } from '@ant-design/icons';
import { colors } from './homeTheme';

interface Props {
  /** Real image URL, once available (e.g. from a CMS extra field). Falls back to a styled placeholder. */
  src?: string | null;
  alt: string;
  aspectRatio?: string;
  borderRadius?: number;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Placeholder art panel used across the home page redesign wherever a real
 * marketing photo isn't available yet. Swaps to the real image automatically
 * once `src` is populated (CMS-provided), so no code change is needed later.
 */
export default function PlaceholderPanel({
  src, alt, aspectRatio = '4 / 3', borderRadius = 16, icon, style,
}: Props) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS-provided URL, not a fixed local asset
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', aspectRatio, borderRadius, objectFit: 'cover', display: 'block', ...style }}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        width: '100%',
        aspectRatio,
        borderRadius,
        background: `linear-gradient(135deg, ${colors.bgMuted} 0%, ${colors.bgAlt} 100%)`,
        border: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {icon ?? <PictureOutlined style={{ fontSize: 40, color: colors.accent, opacity: 0.5 }} />}
    </div>
  );
}

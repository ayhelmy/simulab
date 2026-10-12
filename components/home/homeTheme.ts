/**
 * Shared design tokens for the public home page redesign.
 * Palette is fixed — do not introduce colors outside this set.
 */
import { icons } from 'lucide-react';
import type { CSSProperties } from 'react';

export const colors = {
  primary:  '#F28B36', // orange — primary actions, highlights
  secondary: '#416C82', // dark teal-blue — announcement bar, stat values, dark overlays
  accent:   '#5E95B2', // lighter blue — links, icon accents
  bg:       '#F9F9F9', // page background
  bgAlt:    '#F6F7FA', // alternate section background
  bgMuted:  '#E3E6E9', // muted fill (badges, chips, subtle blocks)
  border:   '#DCDEE1', // card border
  heading:  '#0D1117', // near-black — headings (sampled from reference design)
  body:     '#595E66',
  icons:     '#FFF1D9', // icon color (sampled from reference design)
} as const;

/** hex -> rgba(...) with the given alpha, for tinted fills. */
export function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const ICON_TILE_COLORS = [colors.primary, colors.accent] as const;

export const sectionContainerStyle: CSSProperties = {
  maxWidth: '100vw',
  margin: '0 60px',
  padding: '20px 24px',
};

export const headingStyle: CSSProperties = {
  fontWeight: 700,
  color: colors.heading,
  marginBottom: 10,
  fontSize: 36,
};

export const bodyTextStyle: CSSProperties = {
  color: colors.body,
  fontSize: 16,
};

export const cardStyle: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: '#fff',
};

export const linkStyle: CSSProperties = {
  color: colors.primary,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

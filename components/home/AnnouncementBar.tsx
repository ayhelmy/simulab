'use client';

import { useRouter } from 'next/navigation';
import { colors } from './homeTheme';
import { ArrowRight } from 'lucide-react';

export const ANNOUNCEMENT_BAR_HEIGHT = 40;

export default function AnnouncementBar() {
  const router = useRouter();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 101,
        height: ANNOUNCEMENT_BAR_HEIGHT,
        background: colors.secondary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 5,
        padding: '16px 100px 16px 100px',
        fontSize: 13,
        // margin: ' 0 auto',
        width: '100%',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      <span
        style={{
          background: colors.primary,
          color: '#fff',
          fontWeight: 700,
          fontSize: 10.5,
          letterSpacing: '0.03em',
          borderRadius: 999,
          padding: '3px 12px 3px 12px',
          marginRight: 8,
          flexShrink: 0,
        }}
      >
        NEW
      </span>
        BEDO SimuLearn brings educational labs online with immersive 3D simulations and LMS/LTI integration.
      </span>
      <button
        type="button"
        onClick={() => router.push('/public-catalog')}
        style={{
          background: 'none',
          border: 'none',
          color: colors.primary,
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Explore Simulations <ArrowRight size={14} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
      </button>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { ArrowRightOutlined } from '@ant-design/icons';
import { colors } from '@/components/home/homeTheme';

export default function CTASection() {
  const router = useRouter();

  return (
    <section style={{ background: colors.accent, padding: '64px 24px', textAlign: 'center' }} aria-label="Explore BEDO simulations">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.25 }}>
          Explore BEDO Interactive 3D Simulations
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', margin: '0 0 28px' }}>
          See how browser-based simulations can support practical learning across
          engineering and computer science courses.
        </p>
        <button
          type="button"
          onClick={() => router.push('/public-catalog')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: colors.primary, color: '#fff', border: 'none',
            borderRadius: 10, padding: '13px 26px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Explore Simulations <ArrowRightOutlined />
        </button>
      </div>
    </section>
  );
}

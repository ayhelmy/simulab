'use client';

import { CheckCircleFilled } from '@ant-design/icons';
import type { PlatformStats } from '@/lib/pageContent';
import { colors, tint } from '@/components/home/homeTheme';
import PlaceholderPanel from '@/components/home/PlaceholderPanel';
import Statistics from './Statistics';

const FEATURES = [
  'Supports online access to engineering and computer science labs',
  'Extends lab access beyond the physical classroom',
  'Helps learners preview and explore practical concepts',
  'Helps institutions deliver digital learning experiences more effectively',
];

interface Props {
  stats: PlatformStats | null;
}

export default function AboutSection({ stats }: Props) {
  return (
    <section style={{ background: colors.bg }} aria-label="About BEDO SimuLearn">
      <div style={{padding: '28px 100px 30px'}}>
        <div className="home-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: colors.heading, margin: '0 0 16px' }}>
              About BEDO SimuLearn
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.75, color: colors.body, margin: '0 0 12px' }}>
              BEDO Interactive 3D Simulation is built to help institutions bring engineering and
              computer science labs online through accessible, browser-based 3D simulations.
            </p>
            <p style={{ fontSize: 14.5, lineHeight: 1.75, color: colors.body, margin: '0 0 20px' }}>
              The platform supports practical concept exploration, public previews, and
              institution-ready deployment through LMS / LTI integration.
            </p>

            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES.map((f,i) => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <CheckCircleFilled style={{ color: colors.primary, fontSize: 15, marginTop: 2, flexShrink: 0, background: tint(colors.icons, 0.12), borderRadius: '50%', padding: 2 }} />
                  <span style={{ fontSize: 13.5, lineHeight: 1.6, color: colors.body }}>{f}</span>
                </li>
              ))}
            </ul>

            <Statistics stats={stats} />
          </div>

          <PlaceholderPanel
            src="/images/learning-benefits.png"
            alt="Students exploring BEDO interactive 3D simulations"
            aspectRatio="16/9"
            borderRadius={18}
          />
        </div>
      </div>
    </section>
  );
}

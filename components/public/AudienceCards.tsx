'use client';

import { TeamOutlined, SolutionOutlined, BankOutlined, ApartmentOutlined } from '@ant-design/icons';
import { colors, tint, ICON_TILE_COLORS } from '@/components/home/homeTheme';

const AUDIENCE = [
  { icon: TeamOutlined,      title: 'Students',                description: 'Explore technical concepts visually and interactively.' },
  { icon: SolutionOutlined,  title: 'Instructors',               description: 'Use simulations to support learning, demonstrations, and concept explanation.' },
  { icon: BankOutlined,      title: 'Institutions',              description: 'Expand lab access and support digital learning delivery.' },
  { icon: ApartmentOutlined, title: 'Programs & Departments',     description: 'Organize practical learning experiences in engineering and computer science contexts.' },
];

export default function AudienceCards() {
  return (
    <section style={{ background:'white' }} aria-label="Who BEDO Interactive 3D Simulation supports">
      <div style={{   padding: '28px 100px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: colors.heading, margin: '0 0 10px' }}>
          Who BEDO Interactive 3D Simulation Supports
        </h2>
        <p style={{ fontSize: 14.5, color: colors.body, maxWidth: 560, margin: '0 auto 36px' }}>
          Built to serve the people and organizations that make technical learning happen.
        </p>

        <div className="home-card-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'left' }}>
          {AUDIENCE.map((a, i) => {
            const tileColor = ICON_TILE_COLORS[i % ICON_TILE_COLORS.length];
            const Icon = a.icon;
            return (
              <div key={a.title} style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: '22px 20px' }}>
                <div
                  style={{
                    width: 42, height: 42, borderRadius: 10, marginBottom: 14,
                    background: tint(tileColor, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon style={{ fontSize: 20, color: tileColor }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.heading, margin: '0 0 6px' }}>
                  {a.title}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: colors.body, margin: 0 }}>
                  {a.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

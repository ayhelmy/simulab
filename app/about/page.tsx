'use client';

import { useEffect, useState } from 'react';
import { Layout } from 'antd';
import { getPlatformStats, type PlatformStats } from '@/lib/pageContent';
import { listDemoSimulationsPaginated } from '@/lib/simulations';
import { colors } from '@/components/home/homeTheme';
import AnnouncementBar, { ANNOUNCEMENT_BAR_HEIGHT } from '@/components/home/AnnouncementBar';
import Footer from '@/components/home/Footer';
import PublicHeader from '@/components/public/PublicHeader';
import AboutHero from '@/components/public/AboutHero';
import AboutSection from '@/components/public/AboutSection';
import MissionValueCard from '@/components/public/MissionValueCard';
import AudienceCards from '@/components/public/AudienceCards';
import GallerySection, { type GalleryItem } from '@/components/public/GallerySection';
import CTASection from '@/components/public/CTASection';

const { Content } = Layout;
const HEADER_HEIGHT = 64;

export default function AboutPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    getPlatformStats().then(setStats).catch(() => setStats(null));
    listDemoSimulationsPaginated({ limit: 5 })
      .then((res) => setGallery(res.simulations.map((s) => ({ title: s.title, thumbnailUrl: s.thumbnailUrl }))))
      .catch(() => setGallery([]));
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AnnouncementBar />
      <PublicHeader topOffset={ANNOUNCEMENT_BAR_HEIGHT} />
      <Content style={{ paddingTop: HEADER_HEIGHT + ANNOUNCEMENT_BAR_HEIGHT }}>
        <AboutHero />

        <AboutSection stats={stats} />

        <section style={{ }} aria-label="Mission and value">
          <div style={{   padding: '28px 100px 80px'}}>
            <div className="about-mission-value-grid" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <MissionValueCard
                eyebrow="Our Mission"
                headline="Making technical education more accessible online"
                paragraphs={[
                  'We believe technical education should be more accessible, more flexible, and easier to deliver online.',
                  'BEDO Interactive 3D Simulation helps institutions extend practical learning beyond physical lab limitations by making engineering and computer science simulations available through the browser.',
                ]}
                accentColor={colors.primary}
              />
              <MissionValueCard
                eyebrow="Our Value"
                headline="What Guides BEDO Interactive 3D Simulation"
                paragraphs={[
                  'BEDO Interactive 3D Simulation is built around practical, student-focused learning. It helps learners explore technical concepts more clearly, extends access beyond physical labs, and supports institutions with structured engineering and computer science simulation experiences that connect visual exploration with real practical relevance.',
                ]}
                accentColor={colors.accent}
              />
            </div>
          </div>
        </section>

        <AudienceCards />

        <GallerySection items={gallery} />

        <CTASection />

        <Footer />
      </Content>
    </Layout>
  );
}

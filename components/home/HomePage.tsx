'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Layout, Spin, Result, Button } from 'antd';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/public/PublicHeader';
import AnnouncementBar, { ANNOUNCEMENT_BAR_HEIGHT } from './AnnouncementBar';
import HeroSection from './HeroSection';
import FeatureSection from './FeatureSection';
import FeaturedSimulationsSection from './FeaturedSimulationsSection';
import DemoSection from './DemoSection';
import LearningBenefitsSection from './LearningBenefitsSection';
import LmsIntegrationSection from './LmsIntegrationSection';
import InstitutionalCallToAction from './InstitutionalCallToAction';
import Footer from './Footer';
import { getHomePageData, type HomePagePayload } from '@/lib/pageContent';

const HEADER_HEIGHT = 64;

const { Content } = Layout;

function HomeContent() {
  const [data, setData] = useState<HomePagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getHomePageData()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result
          status="error"
          title="Couldn't load the home page"
          subTitle="Something went wrong while loading content. Please try again."
          extra={<Button type="primary" onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <AnnouncementBar />
      <PublicHeader topOffset={ANNOUNCEMENT_BAR_HEIGHT} />
      <Content style={{ paddingTop: HEADER_HEIGHT + ANNOUNCEMENT_BAR_HEIGHT }}>
        <HeroSection hero={data.hero} />
        <FeatureSection intro={data.features.intro} cards={data.features.cards} />
        <FeaturedSimulationsSection intro={data.featuredSimulations.intro} items={data.featuredSimulations.items} />
        <DemoSection demo={data.demo} />
        <LearningBenefitsSection intro={data.benefits.intro} cards={data.benefits.cards} />
        <LmsIntegrationSection intro={data.lms.intro} cards={data.lms.cards} />
        <InstitutionalCallToAction cta={data.callToAction} />
        <Footer />
      </Content>
    </Layout>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    sessionStorage.removeItem('_logout');
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

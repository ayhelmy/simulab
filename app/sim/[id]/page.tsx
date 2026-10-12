'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout, Spin } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { getSimulation, listDemoSimulationsPaginated } from '@/lib/simulations';
import type { SimulationDetail, CatalogSimulation } from '@/types';
import { colors } from '@/components/home/homeTheme';
import AnnouncementBar, { ANNOUNCEMENT_BAR_HEIGHT } from '@/components/home/AnnouncementBar';
import Footer from '@/components/home/Footer';
import PublicHeader from '@/components/public/PublicHeader';
import SimHeroBanner from '@/components/public/SimHeroBanner';
import SimulationOverview from '@/components/public/SimulationOverview';
import SimulationInfoCard from '@/components/public/SimulationInfoCard';
import LearnerSteps from '@/components/public/LearnerSteps';
import SimulationCard from '@/components/public/SimulationCard';

const { Content } = Layout;
const HEADER_HEIGHT = 64;

export default function SimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!user;

  const [sim,     setSim]     = useState<SimulationDetail | null>(null);
  const [related, setRelated] = useState<CatalogSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setRelated([]);
    getSimulation(id)
      .then((s) => {
        setSim(s);
        if (s.catalogId) {
          listDemoSimulationsPaginated({ catalogId: s.catalogId, includeChildren: true, limit: 4 })
            .then((res) => setRelated(res.simulations.filter((r) => r.id !== s.id).slice(0, 3)))
            .catch(() => setRelated([]));
        }
      })
      .catch((err) => setError(err?.title ?? err?.message ?? 'Simulation not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: colors.bg }}>
        <PublicHeader />
        <div style={{ paddingTop: HEADER_HEIGHT, minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (error || !sim) {
    return (
      <Layout style={{ minHeight: '100vh', background: colors.bg }}>
        <PublicHeader />
        <div style={{ paddingTop: HEADER_HEIGHT, minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ExperimentOutlined style={{ fontSize: 56, color: colors.border }} />
          <p style={{ color: colors.body, fontSize: 16, margin: 0 }}>{error ?? 'Simulation not found.'}</p>
          <button
            type="button"
            onClick={() => router.push('/public-catalog')}
            style={{
              background: colors.primary, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Browse Catalog
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: colors.bg }}>
      <AnnouncementBar />
      <PublicHeader topOffset={ANNOUNCEMENT_BAR_HEIGHT} />
      <Content style={{ paddingTop: HEADER_HEIGHT + ANNOUNCEMENT_BAR_HEIGHT }}>
        <SimHeroBanner simulation={sim} />

        <div style={{ padding: '28px 100px 80px' }}>
          {sim.description && <SimulationOverview description={sim.description} />}

          <SimulationInfoCard simulation={sim} isAuthenticated={isAuthenticated} />

          <LearnerSteps />

          {related.length > 0 && (
            <section aria-label="Related simulations">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.heading, margin: '0 0 16px' }}>
                Related Simulations
              </h2>
              <div className="home-card-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {related.map((r) => (
                  <SimulationCard key={r.id} simulation={r} isAuthenticated={isAuthenticated} />
                ))}
              </div>
            </section>
          )}
        </div>

        <Footer />
      </Content>
    </Layout>
  );
}

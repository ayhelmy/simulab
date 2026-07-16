'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Typography, Row, Col, Card, Button, Skeleton } from 'antd';
import PublicHeader from '@/components/public/PublicHeader';
import { getPageContent, getPlatformStats, type PageContentMap, type PlatformStats } from '@/lib/pageContent';
import { resolveIcon } from '@/lib/iconMap';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function WhySimuLearnPage() {
  const router = useRouter();

  const [content,  setContent]  = useState<PageContentMap | null>(null);
  const [stats,    setStats]    = useState<PlatformStats | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      getPageContent('why_bedo'),
      getPlatformStats(),
    ])
      .then(([c, s]) => { setContent(c); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const heroText = content?.hero?.[0]?.description ?? 'SimuLearn brings the power of virtual laboratory simulations to every student, everywhere — no equipment, no cost, no compromise on quality.';
  const features = content?.features ?? [];

  const statItems = [
    { value: stats ? `${stats.simulationsCount}+`  : '—', label: 'Simulations' },
    { value: stats ? `${stats.institutionsCount}+` : '—', label: 'Institutions' },
    { value: stats ? String(stats.disciplinesCount) : '—', label: 'Disciplines' },
    { value: stats?.uptime ?? '99.9%',                     label: 'Uptime' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <PublicHeader />

      <Content>
        {/* Hero */}
        <section style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF8F1 100%)', padding: '80px 24px 64px', textAlign: 'center' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Title level={1} style={{ fontWeight: 800, fontSize: 42, marginBottom: 20 }}>
              Why SimuLearn?
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#6B7280', marginBottom: 36 }}>
              {heroText}
            </Paragraph>
            <Button type="primary" size="large" onClick={() => router.push('/')}>
              Explore the Catalog
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section style={{ background: '#F59324', padding: '40px 24px' }}>
          <Row justify="center" gutter={[48, 24]} style={{ maxWidth: 860, margin: '0 auto' }}>
            {statItems.map((s) => (
              <Col key={s.label} xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                    {loading ? <Skeleton.Button active style={{ width: 64, height: 36, background: 'rgba(255,255,255,0.3)' }} /> : s.value}
                  </div>
                  <div style={{ fontSize: 14, color: '#FBCE9B', marginTop: 4 }}>{s.label}</div>
                </div>
              </Col>
            ))}
          </Row>
        </section>

        {/* Features */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
          <Title level={2} style={{ textAlign: 'center', fontWeight: 800, marginBottom: 48 }}>
            Everything you need for simulation-based learning
          </Title>
          {loading ? (
            <Row gutter={[24, 24]}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Col xs={24} sm={12} lg={8} key={i}>
                  <Card style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB' }}
                        styles={{ body: { padding: '28px 24px' } }}>
                    <Skeleton active paragraph={{ rows: 3 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Row gutter={[24, 24]}>
              {features.map((f) => (
                <Col xs={24} sm={12} lg={8} key={f.id}>
                  <Card
                    style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB' }}
                    styles={{ body: { padding: '28px 24px' } }}
                  >
                    <div style={{ marginBottom: 14 }}>
                      {resolveIcon(f.iconName, f.iconColor)}
                    </div>
                    <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>
                      {f.title}
                    </Text>
                    <Paragraph type="secondary" style={{ fontSize: 14, margin: 0 }}>
                      {f.description}
                    </Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </section>

        {/* CTA */}
        <section style={{ background: '#F9FAFB', padding: '64px 24px', textAlign: 'center' }}>
          <Title level={3} style={{ fontWeight: 700, marginBottom: 16 }}>
            Ready to transform your lab experience?
          </Title>
          <Paragraph style={{ color: '#6B7280', marginBottom: 28 }}>
            Start with our free demo simulations — no account required.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => router.push('/public-catalog')}>
            Try a Free Demo
          </Button>
        </section>
      </Content>
    </Layout>
  );
}

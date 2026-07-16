'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Typography, Row, Col, Card, Button, Skeleton } from 'antd';
import PublicHeader from '@/components/public/PublicHeader';
import { getPageContent, getPlatformStats, type PageContentMap, type PlatformStats } from '@/lib/pageContent';
import { resolveIcon } from '@/lib/iconMap';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function AboutPage() {
  const router = useRouter();

  const [content, setContent] = useState<PageContentMap | null>(null);
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPageContent('about'), getPlatformStats()])
      .then(([c, s]) => { setContent(c); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hero       = content?.hero?.[0];
  const missionP1  = content?.mission?.[0];
  const missionP2  = content?.mission?.[1];
  const values     = content?.values ?? [];

  const heroTitle = hero?.title ?? 'About SimuLearn';
  const heroDesc  = hero?.description ?? 'SimuLearn is a simulation-based learning platform built to bring the university laboratory experience to every student — regardless of location, equipment access, or institutional resources.';

  const m1 = missionP1?.description ?? 'We believe that every student deserves access to high-quality hands-on science education. Virtual simulations are not a replacement for real labs — they are a powerful complement that removes barriers of cost, safety, and geography.';
  const m2 = missionP2?.description ?? 'SimuLearn gives institutions the tools to embed interactive Unity WebGL simulations directly into their courses, with full learning management integration, automated grading, and analytics.';

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <PublicHeader />

      <Content>
        {/* Hero */}
        <section style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF8F1 100%)', padding: '80px 24px 64px', textAlign: 'center' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{
              width: 64, height: 64, background: '#F59324', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <img src="/Virtual-logo-1.png" alt="SimuLearn Logo" style={{ width: 32, height: 32 }} />
            </div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : (
              <>
                <Title level={1} style={{ fontWeight: 800, fontSize: 42, marginBottom: 20 }}>
                  {heroTitle}
                </Title>
                <Paragraph style={{ fontSize: 18, color: '#6B7280' }}>
                  {heroDesc}
                </Paragraph>
              </>
            )}
          </div>
        </section>

        {/* Mission */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '72px 24px' }}>
          <Row gutter={[40, 0]} align="middle">
            <Col xs={24} md={12}>
              <Title level={2} style={{ fontWeight: 800, marginBottom: 20 }}>
                Our Mission
              </Title>
              {loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                <>
                  <Paragraph style={{ fontSize: 16, color: '#374151', lineHeight: 1.8, marginBottom: 20 }}>
                    {m1}
                  </Paragraph>
                  <Paragraph style={{ fontSize: 16, color: '#374151', lineHeight: 1.8 }}>
                    {m2}
                  </Paragraph>
                </>
              )}
            </Col>
            <Col xs={24} md={12}>
              <div style={{
                background: 'linear-gradient(135deg, #E07B15 0%, #F59324 100%)',
                borderRadius: 16, padding: '40px',
                color: '#fff',
              }}>
                <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>
                  {loading ? '—' : `${stats?.simulationsCount ?? 0}+`}
                </div>
                <div style={{ opacity: 0.8, marginBottom: 28 }}>Interactive simulations</div>
                <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>
                  {loading ? '—' : `${stats?.institutionsCount ?? 0}+`}
                </div>
                <div style={{ opacity: 0.8, marginBottom: 28 }}>Partner institutions</div>
                <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 4 }}>
                  {loading ? '—' : String(stats?.disciplinesCount ?? 0)}
                </div>
                <div style={{ opacity: 0.8 }}>STEM disciplines covered</div>
              </div>
            </Col>
          </Row>
        </section>

        {/* Values */}
        <section style={{ background: '#F9FAFB', padding: '64px 24px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Title level={2} style={{ textAlign: 'center', fontWeight: 800, marginBottom: 48 }}>
              Our Values
            </Title>
            {loading ? (
              <Row gutter={[24, 24]}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Col xs={24} md={8} key={i}>
                    <Card style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB', textAlign: 'center' }}
                          styles={{ body: { padding: '32px 24px' } }}>
                      <Skeleton active paragraph={{ rows: 3 }} />
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Row gutter={[24, 24]}>
                {values.length > 0 ? values.map((v) => (
                  <Col xs={24} md={8} key={v.id}>
                    <Card
                      style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB', textAlign: 'center' }}
                      styles={{ body: { padding: '32px 24px' } }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        {resolveIcon(v.iconName, v.iconColor)}
                      </div>
                      <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>{v.title}</Text>
                      <Paragraph type="secondary" style={{ margin: 0, fontSize: 14 }}>{v.description}</Paragraph>
                    </Card>
                  </Col>
                )) : (
                  // Fallback to static values if DB has no data yet
                  [
                    { id: '1', iconName: 'HeartOutlined', iconColor: '#f5222d', title: 'Student-First', description: 'Every decision we make starts with the question: does this help students learn more effectively?' },
                    { id: '2', iconName: 'RocketOutlined', iconColor: '#fa8c16', title: 'Accessible Science', description: 'Laboratory equipment should not determine who gets to do science. We make experiments universally accessible.' },
                    { id: '3', iconName: 'SafetyCertificateOutlined', iconColor: '#52c41a', title: 'Trusted by Institutions', description: 'Built with enterprise-grade security, role-based access, and multi-tenant isolation from day one.' },
                  ].map((v) => (
                    <Col xs={24} md={8} key={v.id}>
                      <Card
                        style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB', textAlign: 'center' }}
                        styles={{ body: { padding: '32px 24px' } }}
                      >
                        <div style={{ marginBottom: 16 }}>{resolveIcon(v.iconName, v.iconColor)}</div>
                        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>{v.title}</Text>
                        <Paragraph type="secondary" style={{ margin: 0, fontSize: 14 }}>{v.description}</Paragraph>
                      </Card>
                    </Col>
                  ))
                )}
              </Row>
            )}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '72px 24px', textAlign: 'center' }}>
          <Title level={3} style={{ fontWeight: 700, marginBottom: 16 }}>
            Start exploring SimuLearn today
          </Title>
          <Paragraph style={{ color: '#6B7280', marginBottom: 28 }}>
            Browse our public simulation catalog — no account required.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => router.push('/public-catalog')}>
            Explore Simulations
          </Button>
        </section>
      </Content>
    </Layout>
  );
}

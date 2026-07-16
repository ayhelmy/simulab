'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Typography, Row, Col, Card, Button, Tag, Skeleton } from 'antd';
import PublicHeader from '@/components/public/PublicHeader';
import { getPageContent, type PageContentMap } from '@/lib/pageContent';
import { resolveIcon } from '@/lib/iconMap';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function ResourcesPage() {
  const router = useRouter();

  const [content, setContent] = useState<PageContentMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPageContent('resources')
      .then(setContent)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const heroDesc = content?.hero?.[0]?.description
    ?? 'Everything you need to get the most out of SimuLearn — from quick-start guides to in-depth API documentation.';

  const cards = content?.cards ?? [];

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, rgb(247, 246, 244) 0%, rgb(255, 248, 241) 100%)' }}>
      <PublicHeader />

      <Content style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={1} style={{ fontWeight: 800, fontSize: 40, marginBottom: 16 }}>
            Resources
          </Title>
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} style={{ maxWidth: 540, margin: '0 auto' }} />
          ) : (
            <Paragraph style={{ fontSize: 17, color: '#6B7280', maxWidth: 540, margin: '0 auto' }}>
              {heroDesc}
            </Paragraph>
          )}
        </div>

        {loading ? (
          <Row gutter={[20, 20]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <Card
                  style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB' }}
                  styles={{ body: { padding: '24px' } }}
                >
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[20, 20]}>
            {(cards.length > 0 ? cards : FALLBACK_CARDS).map((r) => (
              <Col xs={24} sm={12} lg={8} key={r.id}>
                <Card
                  hoverable
                  style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB' }}
                  styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ marginBottom: 12 }}>
                    {resolveIcon(r.iconName, r.iconColor, 24)}
                  </div>
                  {r.category && (
                    <Tag
                      style={{
                        background: `${r.categoryColor ?? '#F59324'}14`,
                        color: r.categoryColor ?? '#F59324',
                        border: 'none', borderRadius: 20, width: 'fit-content',
                        fontSize: 11, fontWeight: 600, marginBottom: 10,
                      }}
                    >
                      {r.category}
                    </Tag>
                  )}
                  <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>{r.title}</Text>
                  <Paragraph type="secondary" style={{ fontSize: 13, flex: 1, margin: 0 }}>{r.description}</Paragraph>
                  {r.ctaText && (
                    <Button type="link" style={{ padding: 0, marginTop: 16, color: '#F59324', fontWeight: 600 }}>
                      {r.ctaText} →
                    </Button>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <Button type="primary" size="large" onClick={() => router.push('/login')}>
            Sign In to Access All Resources
          </Button>
        </div>
      </Content>
    </Layout>
  );
}

// Used only when DB has no resource cards seeded yet
const FALLBACK_CARDS = [
  { id: '1', iconName: 'BookOutlined',          iconColor: '#F59324', category: 'Guide',     categoryColor: '#F59324', title: 'Getting Started with SimuLearn', description: 'Learn how to set up your institution, create courses, and add simulations in under 30 minutes.', ctaText: 'Read Guide' },
  { id: '2', iconName: 'VideoCameraOutlined',   iconColor: '#722ed1', category: 'Video',     categoryColor: '#722ed1', title: 'Running Your First Virtual Lab', description: 'A step-by-step walkthrough of launching a WebGL simulation and reviewing student results.', ctaText: 'Watch Video' },
  { id: '3', iconName: 'FileTextOutlined',      iconColor: '#52c41a', category: 'Tutorial',  categoryColor: '#52c41a', title: 'Course Builder Deep Dive', description: 'Build multi-lesson courses with embedded simulations, configure scoring, and manage enrollment.', ctaText: 'Read Tutorial' },
  { id: '4', iconName: 'ApiOutlined',           iconColor: '#fa8c16', category: 'API Docs',  categoryColor: '#fa8c16', title: 'Developer API Reference', description: 'Full REST API reference for LTI integration, simulation catalog access, and webhook configuration.', ctaText: 'View Docs' },
  { id: '5', iconName: 'QuestionCircleOutlined', iconColor: '#f5222d', category: 'FAQ',      categoryColor: '#f5222d', title: 'Frequently Asked Questions', description: 'Answers to the most common questions from students, instructors, and institution administrators.', ctaText: 'Browse FAQs' },
  { id: '6', iconName: 'TeamOutlined',          iconColor: '#13c2c2', category: 'Community', categoryColor: '#13c2c2', title: 'Instructor Community Forum', description: 'Share tips, simulation ideas, and best practices with educators from institutions worldwide.', ctaText: 'Join Forum' },
] as const;

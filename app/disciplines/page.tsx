'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Typography, Row, Col, Card, Button, Spin, Empty } from 'antd';
import {
  SettingOutlined, HomeOutlined, SafetyOutlined, ToolOutlined,
  AimOutlined, ThunderboltOutlined, GlobalOutlined, CarOutlined,
  ReadOutlined, ExperimentOutlined, CodeOutlined, WifiOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import PublicHeader from '@/components/public/PublicHeader';
import { getDemoCatalogTree } from '@/lib/simulations';
import type { SimulationCatalog } from '@/types';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

// ── Visual mapping: keywords → icon + color ───────────────────────────────────

const VISUAL_MAP: Array<{ keywords: string[]; icon: React.ReactNode; color: string; discription: string }> = [
  { keywords: ['mechatronics'],                      icon: <SettingOutlined />,     color: '#1677ff', discription: 'Discover the world of mechatronics with our interactive simulations.' },
  { keywords: ['civil'],                             icon: <HomeOutlined />,        color: '#52c41a', discription: 'Find relevant content for your students with Bedo Simulearn curated civil engineering simulations and courses.' },
  { keywords: ['occupational', 'safety', 'health'],  icon: <SafetyOutlined />,     color: '#f5222d', discription: 'Explore occupational safety and health with our curated simulations and courses.' },
  { keywords: ['mechanical'],                        icon: <ToolOutlined />,        color: '#fa8c16', discription: 'Explore mechanical engineering with our curated simulations and courses.' },
  { keywords: ['calibration'],                       icon: <AimOutlined />,         color: '#722ed1', discription: 'Discover the importance of calibration with our interactive simulations.' },
  { keywords: ['electrical'],                        icon: <ThunderboltOutlined />, color: '#faad14', discription: 'Explore electrical engineering with our curated simulations and courses.' },
  { keywords: ['renewable', 'energy'],               icon: <GlobalOutlined />,      color: '#13c2c2', discription: 'Find relevant content for your students with Bedo Simulearn curated renewable energy simulations and courses.' },
  { keywords: ['automotive'],                        icon: <CarOutlined />,         color: '#eb2f96', discription: 'Discover the world of automotive engineering with our interactive simulations.' },
  { keywords: ['stem', 'education'],                 icon: <ReadOutlined />,        color: '#F59324', discription: 'Explore STEM education with our curated simulations and courses.' },
  { keywords: ['physics'],                           icon: <ExperimentOutlined />,  color: '#096dd9', discription: 'Find relevant content for your students with Bedo Simulearn curated physics simulations and courses.' },
  { keywords: ['computer', 'ai', 'artificial'],      icon: <CodeOutlined />,        color: '#531dab', discription: 'Discover the world of computer science and artificial intelligence with our interactive simulations.' },
  { keywords: ['electronics', 'communication'],      icon: <WifiOutlined />,        color: '#08979c', discription: 'Find relevant content for your students with Bedo Simulearn curated electronics and communication simulations and courses.' },
];

const FALLBACK_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#f5222d', '#13c2c2'];

function getVisual(name: string, idx: number): { icon: React.ReactNode; color: string } {
  const lower = name.toLowerCase();
  for (const entry of VISUAL_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { icon: entry.icon, color: entry.color };
    }
  }
  return { icon: <ApartmentOutlined />, color: FALLBACK_COLORS[idx % FALLBACK_COLORS.length] };
}

// ── Sum item counts across a catalog subtree ──────────────────────────────────

function sumSubtree(catalog: SimulationCatalog): number {
  return (catalog.itemCount ?? 0) +
    (catalog.children ?? []).reduce((acc, child) => acc + sumSubtree(child), 0);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DisciplinesPage() {
  const router = useRouter();
  const [roots, setRoots]   = useState<SimulationCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDemoCatalogTree()
      .then((tree) => setRoots(tree))   // tree is already root-level nodes with children nested
      .catch(() => setRoots([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, rgb(247, 246, 244) 0%, rgb(255, 248, 241) 100%)' }}>
      <PublicHeader />

      <Content style={{maxWidth: 1100, margin: '0 auto', padding: '56px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={1} style={{ fontWeight: 800, fontSize: 40, marginBottom: 16 }}>
            Explore by Discipline
          </Title>
          <Paragraph style={{ fontSize: 17, color: '#6B7280', maxWidth: 560, margin: '0 auto' }}>
            BEDO covers the full breadth of STEM education — from introductory
            physics to advanced engineering simulations.
          </Paragraph>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : roots.length === 0 ? (
          <Empty description="No disciplines available yet." style={{ padding: '80px 0' }} />
        ) : (
          <Row gutter={[20, 20]} justify="center" >
            {roots.map((catalog, idx) => {
              const { icon, color } = getVisual(catalog.name, idx);
              const total = sumSubtree(catalog);
              return (
                <Col xs={24} sm={12} lg={8} key={catalog.id} style={{}}>
                  <Card
                    hoverable
                    onClick={() =>
                      router.push(`/?catalog=${encodeURIComponent(catalog.id)}&subtree=true`)
                    }
                    style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB' }}
                    styles={{ body: { padding: '28px 24px' } }}
                  >
                    <div style={{ marginBottom: 14, fontSize: 28, color }}>
                      {icon}
                    </div>
                    <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>
                      {catalog.name}
                    </Text>
                    <div style={{ flexGrow: 1 }} />
                    <Paragraph style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                      {VISUAL_MAP.find((entry) => entry.keywords.some((kw) => catalog.name.toLowerCase().includes(kw)))?.discription || 'Explore our curated simulations and courses.'}
                    </Paragraph>
                    <Paragraph type="secondary" style={{ fontSize: 14, margin: 0 }}>
                      {total > 0 ? `${total} simulation${total !== 1 ? 's' : ''}` : 'Coming soon'}
                    </Paragraph>

                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <Button type="primary" size="large" onClick={() => router.push('/public-catalog')}>
            Browse All Simulations
          </Button>
        </div>
      </Content>
    </Layout>
  );
}

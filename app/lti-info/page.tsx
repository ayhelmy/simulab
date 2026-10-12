'use client';

import { useRouter } from 'next/navigation';
import { Layout, Typography, Row, Col, Card, Button } from 'antd';
import { ApiOutlined, UserOutlined, BankOutlined, CheckCircleOutlined } from '@ant-design/icons';
import PublicHeader from '@/components/public/PublicHeader';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const CAPABILITIES = [
  {
    icon: <ApiOutlined style={{ fontSize: 28, color: '#F59324' }} />,
    title: 'LTI 1.3 Core',
    description: 'OIDC-based login and launch, so simulations open directly from an assignment or course link in your LMS.',
  },
  {
    icon: <UserOutlined style={{ fontSize: 28, color: '#0284C7' }} />,
    title: 'Roster & Grade Sync',
    description: 'Names and Role Provisioning Services (NRPS) keep rosters current; Assignment and Grade Services (AGS) send simulation scores back to your gradebook automatically.',
  },
  {
    icon: <BankOutlined style={{ fontSize: 28, color: '#059669' }} />,
    title: 'Deep Linking',
    description: 'Instructors can browse the simulation catalog from inside the LMS and insert a launch link into any assignment or module.',
  },
];

export default function LtiInfoPage() {
  const router = useRouter();

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <PublicHeader />
      <Content style={{ paddingTop: 64 }}>
        <section style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF8F1 100%)', padding: '80px 24px 64px', textAlign: 'center' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Title level={1} style={{ fontWeight: 800, fontSize: 42, marginBottom: 20 }}>
              LTI Integration
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#6B7280', marginBottom: 36 }}>
              BEDO SimuLearn is an LTI 1.3 compliant tool provider — connect it to your institution&apos;s
              learning management system and let students launch simulations directly from their courses,
              with grades and rosters kept in sync automatically.
            </Paragraph>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button type="primary" size="large" onClick={() => router.push('/register')}>
                Request Institution Setup
              </Button>
              <Button size="large" onClick={() => router.push('/public-catalog')}>
                Explore Simulations
              </Button>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
          <Title level={2} style={{ textAlign: 'center', fontWeight: 800, marginBottom: 48 }}>
            What LTI integration gives your institution
          </Title>
          <Row gutter={[24, 24]}>
            {CAPABILITIES.map((c) => (
              <Col xs={24} sm={12} lg={8} key={c.title}>
                <Card style={{ height: '100%', borderRadius: 12, border: '1px solid #E5E7EB' }}
                      styles={{ body: { padding: '28px 24px' } }}>
                  <div style={{ marginBottom: 14 }}>{c.icon}</div>
                  <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>
                    {c.title}
                  </Text>
                  <Paragraph type="secondary" style={{ fontSize: 14, margin: 0 }}>
                    {c.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        <section style={{ background: '#F9FAFB', padding: '64px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Title level={3} style={{ fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
              How it works
            </Title>
            {[
              'Your institution admin registers BEDO SimuLearn as an LTI 1.3 tool in your LMS and shares the platform details with our team.',
              'We register your LMS as a trusted platform and exchange the required keys — no manual credential sharing.',
              'Instructors add a SimuLearn launch link to any assignment via deep linking, directly from the LMS course editor.',
              'Students launch simulations from the LMS with no separate login, and completed scores sync back to the LMS gradebook.',
            ].map((step) => (
              <div key={step} style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                <CheckCircleOutlined style={{ fontSize: 20, color: '#059669', marginTop: 2, flexShrink: 0 }} />
                <Text style={{ fontSize: 15, color: '#374151' }}>{step}</Text>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '64px 24px', textAlign: 'center' }}>
          <Title level={3} style={{ fontWeight: 700, marginBottom: 16 }}>
            Ready to connect your LMS?
          </Title>
          <Paragraph style={{ color: '#6B7280', marginBottom: 28 }}>
            Reach out and we&apos;ll walk your institution through LTI setup.
          </Paragraph>
          <Button type="primary" size="large" onClick={() => router.push('/register')}>
            Get Started
          </Button>
        </section>
      </Content>
    </Layout>
  );
}

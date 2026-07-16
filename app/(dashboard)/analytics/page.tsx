'use client';

import { useAuth } from '@/context/AuthContext';
import PermissionGuard from '@/components/layout/PermissionGuard';
import {
  Row, Col, Card, Statistic, Tabs, Select, Table, Tag, Skeleton, Typography,
} from 'antd';
import {
  LineChartOutlined, TeamOutlined, BookOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text } = Typography;

export default function AnalyticsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin') || hasRole('institution_admin');

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Total Enrollments" value="—" prefix={<TeamOutlined style={{ color: '#F59324' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Course Completions" value="—" prefix={<BookOutlined style={{ color: '#059669' }} />} styles={{ content: { color: '#059669' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Simulations Launched" value="—" prefix={<ExperimentOutlined style={{ color: '#D97706' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Avg. Score" value="—" suffix="%" prefix={<LineChartOutlined style={{ color: '#7C3AED' }} />} />
            </Card>
          </Col>

          <Col span={24}>
            <Card title="Completion Trend" extra={<Tag color="blue">Coming soon</Tag>}>
              <Skeleton active paragraph={{ rows: 6 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Charts will be rendered here once the analytics data pipeline is wired up.
              </Text>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'courses',
      label: 'Courses',
      children: (
        <Card title="Course Performance">
          <Table
            dataSource={[]}
            columns={[
              { title: 'Course', dataIndex: 'title', key: 'title' },
              { title: 'Enrollments', dataIndex: 'enrollments', key: 'enrollments' },
              { title: 'Completions', dataIndex: 'completions', key: 'completions' },
              { title: 'Avg. Score', dataIndex: 'avgScore', key: 'avgScore' },
            ]}
            locale={{ emptyText: 'Analytics data not yet available.' }}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    ...(isAdmin ? [{
      key: 'users',
      label: 'Users',
      children: (
        <Card title="User Activity">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ),
    }] : []),
  ];

  return (
    <PermissionGuard permission="analytics:view">
      <div>
        <PageHeader
          title="Analytics"
          subtitle={isAdmin ? 'Institution-level analytics overview' : 'Course and simulation performance'}
          extra={
            <Select
              defaultValue="30d"
              style={{ width: 140 }}
              options={[
                { value: '7d',  label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
              ]}
            />
          }
        />
        <Tabs items={tabItems} />
      </div>
    </PermissionGuard>
  );
}

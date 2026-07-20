'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Row, Col, Card, Statistic, Typography, Skeleton, Tag, Button, Space, Divider,
} from 'antd';
import {
  BookOutlined, ExperimentOutlined, TrophyOutlined, TeamOutlined,
  ApartmentOutlined, BankOutlined, FileTextOutlined, BarChartOutlined,
  EditOutlined, PlusOutlined, SolutionOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import { getDashboardStats } from '@/lib/dashboard';

const { Text, Title } = Typography;

export default function DashboardPage() {
  const { user, hasRole, institutionName } = useAuth();
  const router = useRouter();

  const isSuperAdmin       = hasRole('super_admin');
  const isInstitutionAdmin = hasRole('institution_admin');
  const isInstructor       = hasRole('instructor') || hasRole('content_creator') || hasRole('teaching_assistant');
  const isStudent          = !isSuperAdmin && !isInstitutionAdmin && !isInstructor;

  const [stats, setStats]     = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDashboardStats()
      .then((data) => setStats(data as unknown as Record<string, number>))
      .catch(() => {/* silently fall back */})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const val = (key: string) => loading ? undefined : (stats[key] ?? 0);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.firstName}!`}
        subtitle={
          isSuperAdmin       ? 'Platform overview' :
          isInstitutionAdmin ? `Managing ${institutionName ?? 'your institution'}` :
          isInstructor       ? 'Your teaching overview' :
          'Your learning progress'
        }
      />

      {/* -- Super Admin ----------------------------------------------------─ */}
      {isSuperAdmin && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Total Users" value={val('totalUsers')}
                prefix={<TeamOutlined style={{ color: '#F59324' }} />}
                styles={{ content: { color: '#F59324' } }} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Institutions" value={val('totalInstitutions')}
                prefix={<BankOutlined style={{ color: '#059669' }} />}
                styles={{ content: { color: '#059669' } }} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Total Courses" value={val('totalCourses')}
                prefix={<BookOutlined style={{ color: '#D97706' }} />}
                styles={{ content: { color: '#D97706' } }} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Active Enrollments" value={val('totalEnrollments')}
                prefix={<ExperimentOutlined style={{ color: '#7C3AED' }} />}
                styles={{ content: { color: '#7C3AED' } }} loading={loading} />
            </Card>
          </Col>
        </Row>
      )}

      {/* -- Institution Admin ----------------------------------------------─ */}
      {isInstitutionAdmin && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Institution Users" value={val('totalUsers')}
                  prefix={<TeamOutlined style={{ color: '#F59324' }} />}
                  styles={{ content: { color: '#F59324' } }} loading={loading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Total Courses" value={val('totalCourses')}
                  prefix={<BookOutlined style={{ color: '#059669' }} />}
                  styles={{ content: { color: '#059669' } }} loading={loading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Active Enrollments" value={val('totalEnrollments')}
                  prefix={<FileTextOutlined style={{ color: '#D97706' }} />}
                  styles={{ content: { color: '#D97706' } }} loading={loading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Departments" value={val('totalDepartments')}
                  prefix={<ApartmentOutlined style={{ color: '#7C3AED' }} />}
                  styles={{ content: { color: '#7C3AED' } }} loading={loading} />
              </Card>
            </Col>
          </Row>

          {/* Quick actions */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Quick Actions" size="small">
                <Space wrap>
                  <Button icon={<BookOutlined />} onClick={() => router.push('/courses')}>
                    Manage Courses
                  </Button>
                  <Button icon={<TeamOutlined />} onClick={() => router.push('/users')}>
                    Manage Users
                  </Button>
                  <Button icon={<ApartmentOutlined />} onClick={() => router.push(`/institutions/${user.institutionId}`)}>
                    Institution Settings
                  </Button>
                  <Button icon={<ExperimentOutlined />} onClick={() => router.push('/simulations')}>
                    View Simulations
                  </Button>
                  <Button icon={<BarChartOutlined />} onClick={() => router.push('/analytics')}>
                    Analytics
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Recent Activity" extra={<Tag color="blue">Coming soon</Tag>} size="small">
                <Skeleton active paragraph={{ rows: 3 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Activity feed will be available once the notifications module is implemented.
                </Text>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* -- Instructor / TA ------------------------------------------------─ */}
      {isInstructor && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Published Courses" value={val('activeCourses')}
                  prefix={<BookOutlined style={{ color: '#F59324' }} />}
                  styles={{ content: { color: '#F59324' } }} loading={loading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Draft Courses" value={val('draftCourses')}
                  prefix={<EditOutlined style={{ color: '#D97706' }} />}
                  styles={{ content: { color: '#D97706' } }} loading={loading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Active Students" value={val('activeStudents')}
                  prefix={<TeamOutlined style={{ color: '#059669' }} />}
                  styles={{ content: { color: '#059669' } }} loading={loading} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic title="Avg Score" value="—" suffix="%"
                  prefix={<TrophyOutlined style={{ color: '#7C3AED' }} />}
                  styles={{ content: { color: '#7C3AED' } }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Quick Actions" size="small">
                <Space wrap>
                  <Button icon={<PlusOutlined />} type="primary" onClick={() => router.push('/courses/new')}>
                    Create Course
                  </Button>
                  <Button icon={<BookOutlined />} onClick={() => router.push('/courses')}>
                    My Courses
                  </Button>
                  <Button icon={<ExperimentOutlined />} onClick={() => router.push('/simulations')}>
                    Simulations
                  </Button>
                  <Button icon={<SolutionOutlined />} onClick={() => router.push('/grades')}>
                    Gradebook
                  </Button>
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Recent Activity" extra={<Tag color="blue">Coming soon</Tag>} size="small">
                <Skeleton active paragraph={{ rows: 3 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Activity feed will be available once the notifications module is implemented.
                </Text>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* -- Student --------------------------------------------------------─ */}
      {isStudent && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Enrolled Courses" value={val('enrolledCourses')}
                prefix={<BookOutlined style={{ color: '#F59324' }} />}
                styles={{ content: { color: '#F59324' } }} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Completed Courses" value={val('completedCourses')}
                prefix={<TrophyOutlined style={{ color: '#D97706' }} />}
                styles={{ content: { color: '#D97706' } }} loading={loading} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Simulations Run" value="—"
                prefix={<ExperimentOutlined style={{ color: '#059669' }} />}
                styles={{ content: { color: '#059669' } }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Average Score" value="—" suffix="%"
                prefix={<TrophyOutlined style={{ color: '#7C3AED' }} />}
                styles={{ content: { color: '#7C3AED' } }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* -- Bottom row (super_admin and student only) ---------------------- */}
      {!isInstitutionAdmin && !isInstructor && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Recent Activity" extra={<Tag color="blue">Coming soon</Tag>}>
              <Skeleton active paragraph={{ rows: 4 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Activity feed will be available once the notifications module is implemented.
              </Text>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={isStudent ? 'My Progress' : 'Quick Stats'} extra={<Tag color="blue">Coming soon</Tag>}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

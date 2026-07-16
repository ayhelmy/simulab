'use client';

import { useAuth } from '@/context/AuthContext';
import PermissionGuard from '@/components/layout/PermissionGuard';
import {
  Table, Card, Select, Button, Tag, Row, Col, Typography, Input,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Search } = Input;
const { Text } = Typography;

export default function GradebookPage() {
  const { hasRole } = useAuth();
  const isStudent    = hasRole('student');
  const canManage    = hasRole('instructor') || hasRole('teaching_assistant') ||
                       hasRole('super_admin') || hasRole('institution_admin');

  const columns = [
    { title: 'Student',        key: 'student',    dataIndex: 'student' },
    { title: 'Course',         key: 'course',     dataIndex: 'course' },
    { title: 'Assignment',     key: 'assignment', dataIndex: 'assignment' },
    {
      title: 'Score',
      key: 'score',
      dataIndex: 'score',
      render: (score: number | undefined) => score != null ? `${score}%` : '—',
      sorter: true,
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="default">—</Tag>,
    },
    ...(canManage ? [{
      title: 'Actions',
      key: 'actions',
      render: () => <Button size="small">Override</Button>,
    }] : []),
  ];

  return (
    <PermissionGuard permission="grades:view_own">
      <div>
        <PageHeader
          title={isStudent ? 'My Grades' : 'Gradebook'}
          subtitle={isStudent ? 'Your grade overview across all courses' : 'Manage grades and assessments'}
          extra={
            canManage ? (
              <Button icon={<DownloadOutlined />}>Export CSV</Button>
            ) : undefined
          }
        />

        {canManage && (
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col flex="1 1 200px">
              <Search placeholder="Search student or assignment…" prefix={<SearchOutlined />} allowClear />
            </Col>
            <Col flex="0 0 180px">
              <Select placeholder="All Courses" allowClear style={{ width: '100%' }} options={[]} />
            </Col>
            <Col flex="0 0 140px">
              <Select
                placeholder="All Statuses"
                allowClear
                style={{ width: '100%' }}
                options={[
                  { value: 'passed',   label: 'Passed' },
                  { value: 'failed',   label: 'Failed' },
                  { value: 'pending',  label: 'Pending' },
                ]}
              />
            </Col>
          </Row>
        )}

        <Card>
          <Table
            dataSource={[]}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            locale={{
              emptyText: (
                <Text type="secondary">
                  {isStudent
                    ? 'No grades recorded yet. Complete course assignments to see grades here.'
                    : 'No grades yet. Grades will appear once students complete assignments.'}
                </Text>
              ),
            }}
            scroll={{ x: 600 }}
          />
        </Card>
      </div>
    </PermissionGuard>
  );
}

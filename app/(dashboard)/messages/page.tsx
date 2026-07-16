'use client';

import PermissionGuard from '@/components/layout/PermissionGuard';
import { Row, Col, Card, Empty, Typography } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text, Title } = Typography;

export default function MessagesPage() {
  return (
    <PermissionGuard permission="messages:send">
      <div>
        <PageHeader title="Messages" subtitle="Direct messages and announcements" />

        <Row gutter={16} style={{ minHeight: 500 }}>
          <Col xs={24} md={8}>
            <Card title="Conversations" 
            // bodyStyle={{ padding: 0 }} 
            style={{ height: '100%' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No conversations yet"
                style={{ padding: '3rem 0' }}
              />
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '4rem 0' }}>
                <Empty
                  image={<MessageOutlined style={{ fontSize: 64, color: '#D1D5DB' }} />}
                  description={
                    <>
                      <Title level={5} type="secondary">No conversation selected</Title>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        The messaging module will be fully implemented in a future release.
                      </Text>
                    </>
                  }
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </PermissionGuard>
  );
}

'use client';

import { Row, Col, Card, Skeleton } from 'antd';

export default function DashboardSkeleton() {
  return (
    <div>
      <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24, maxWidth: 400 }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card><Skeleton active paragraph={{ rows: 5 }} /></Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card><Skeleton active paragraph={{ rows: 5 }} /></Card>
        </Col>
      </Row>
    </div>
  );
}

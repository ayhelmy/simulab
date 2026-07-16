'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Result, Button, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function UnauthorizedPage() {
  const router       = useRouter();
  const { user }     = useAuth();
  const primaryRole  = user?.roles[0]?.label ?? 'your role';

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Result
        icon={<LockOutlined style={{ fontSize: 56, color: '#EF4444' }} />}
        status="403"
        title="Access Denied"
        subTitle={
          <>
            You don&apos;t have permission to view this page.
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Your current role is <strong>{primaryRole}</strong>. Contact your administrator if you believe this is a mistake.
            </Text>
          </>
        }
        extra={[
          <Button key="home" type="primary" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>,
          <Button key="back" onClick={() => router.back()}>
            Go Back
          </Button>,
        ]}
      />
    </div>
  );
}

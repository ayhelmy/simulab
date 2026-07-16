'use client';

import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Alert, Card, Typography } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function DepartmentsPage() {
  const allowed = useRouteGuard('departments.view', 'departments.create', 'departments.manage');
  const { institutionId } = useAuth();

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage departments within your institution"
      />
      <Alert
        type="info"
        showIcon
        icon={<ApartmentOutlined />}
        title="Departments are managed per-institution."
        description={
          institutionId ? (
            <Text>
              Navigate to <strong>Institutions → your institution → Departments</strong> tab to manage departments.
            </Text>
          ) : (
            <Text>Select an institution to manage its departments.</Text>
          )
        }
        style={{ marginBottom: 16 }}
      />
      {institutionId && (
        <Card size="small">
          <Text type="secondary">
            Department management is available in the institution detail page.
            Click on your institution in the Institutions section to access department settings.
          </Text>
        </Card>
      )}
    </div>
  );
}

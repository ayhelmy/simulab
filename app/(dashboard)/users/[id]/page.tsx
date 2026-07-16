'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, revokeRole } from '@/lib/users';
import { useAuth } from '@/context/AuthContext';
import RoleAssignModal from '@/components/users/RoleAssignModal';
import type { User } from '@/types';
import {
  Card, Avatar, Tag, Button, Typography, Descriptions, Space, Spin, Alert,
  Breadcrumb, Popconfirm, Row, Col, App,
} from 'antd';
import { UserOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';

const { Text } = Typography;

const ROLE_COLOR: Record<string, string> = {
  super_admin: 'purple', institution_admin: 'blue', dept_manager: 'cyan',
  instructor: 'orange', teaching_assistant: 'gold',
};

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

interface Props { params: Promise<{ id: string }> }

export default function UserDetailPage({ params }: Props) {
  const { id }         = use(params);
  const router         = useRouter();
  const { hasPermission } = useAuth();
  const { message }    = App.useApp();

  const [user,      setUser]      = useState<User | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState(false);

  const canManage = hasPermission('users.update_institution') || hasPermission('users.update_all');

  const load = async () => {
    setLoading(true);
    try {
      setUser(await getUser(id));
    } catch (err: unknown) {
      const e = err as { title?: string; status?: number };
      if (e.status === 404) { router.push('/users'); return; }
      setError(e.title ?? 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleRevoke = async (roleId: string) => {
    try {
      await revokeRole(id, roleId);
      message.success('Role removed.');
      load();
    } catch {
      message.error('Failed to revoke role.');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error)   return <Alert type="error" title={error} showIcon />;
  if (!user)   return null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <a onClick={() => router.push('/users')}>User Management</a> },
          { title: `${user.firstName} ${user.lastName}` },
        ]}
      />

      {/* Profile card */}
      <Card
      //  bodyStyle={{ padding: 0 }} 
       style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 72, background: 'linear-gradient(135deg, #F59324 0%, #E07B15 100%)' }} />
        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -32 }}>
            <Avatar
              size={64}
              src={user.avatarUrl}
              icon={<UserOutlined />}
              style={{ background: '#F59324', fontWeight: 700, border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            >
              {!user.avatarUrl && getInitials(user.firstName, user.lastName)}
            </Avatar>
            <StatusTag status={user.status} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 18, display: 'block' }}>
              {user.firstName} {user.lastName}
            </Text>
            <Text type="secondary">{user.email}</Text>
          </div>
        </div>
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={14}>
          {/* Account info */}
          <Card title="Account Info" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Institution ID">{user.institutionId ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Last Login">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true,
                }) : 'Never'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {new Date(user.createdAt).toLocaleDateString('en-US')}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US') : '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={10}>
          {/* Roles */}
          <Card
            title="Roles"
            extra={
              canManage && (
                <Button size="small" icon={<PlusOutlined />} onClick={() => setRoleModal(true)}>
                  Assign
                </Button>
              )
            }
          >
            {user.roles.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>No roles assigned.</Text>
            ) : (
              <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                {user.roles.map((role) => (
                  <div key={role.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' }}>
                    <Space size={6}>
                      <Tag color={ROLE_COLOR[role.name] ?? 'default'} style={{ margin: 0 }}>{role.label}</Tag>
                      <Text type="secondary" style={{ fontSize: 11 }}>{role.name}</Text>
                    </Space>
                    {canManage && (
                      <Popconfirm
                        title="Remove this role?"
                        onConfirm={() => handleRevoke(role.id)}
                        okText="Remove"
                        okButtonProps={{ danger: true }}
                        cancelText="Cancel"
                      >
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {roleModal && (
        <RoleAssignModal
          user={user}
          onClose={() => setRoleModal(false)}
          onSuccess={() => { setRoleModal(false); load(); }}
        />
      )}
    </div>
  );
}

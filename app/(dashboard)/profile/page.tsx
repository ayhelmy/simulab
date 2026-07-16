'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateUser } from '@/lib/users';
import {
  Card, Avatar, Button, Form, Input, Tag, Descriptions, Typography, Row, Col, Space, App,
} from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export default function ProfilePage() {
  const { user, updateUser: syncUser } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  if (!user) return null;

  // user is narrowed to User here; use non-null assertion in closures since component
  // only renders when user !== null
  const currentUser = user;
  const joinDate = new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function handleEdit() {
    form.setFieldsValue({
      firstName: currentUser.firstName,
      lastName:  currentUser.lastName,
      bio:       currentUser.bio ?? '',
      avatarUrl: currentUser.avatarUrl ?? '',
    });
    setEditing(true);
  }

  async function handleSave(values: { firstName: string; lastName: string; bio?: string; avatarUrl?: string }) {
    setSaving(true);
    try {
      const updated = await updateUser(currentUser.id, {
        firstName: values.firstName.trim() || undefined,
        lastName:  values.lastName.trim()  || undefined,
        bio:       values.bio?.trim()       || undefined,
        avatarUrl: values.avatarUrl?.trim() || undefined,
      });
      syncUser(updated);
      message.success('Profile updated successfully.');
      setEditing(false);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title="My Profile"
        subtitle="Your personal details and account information"
      />

      {/* Profile card with hero banner */}
      <Card
      //  bodyStyle={{ padding: 0 }} 
       style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: 80, background: 'linear-gradient(135deg, #F59324 0%, #E07B15 100%)' }} />
        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36 }}>
            <Avatar
              size={72}
              src={currentUser.avatarUrl}
              icon={<UserOutlined />}
              style={{ background: '#F59324', fontSize: 24, fontWeight: 700, border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
            >
              {!currentUser.avatarUrl && getInitials(user.firstName, user.lastName)}
            </Avatar>
            {!editing && (
              <Button icon={<EditOutlined />} onClick={handleEdit} style={{ marginBottom: 4 }}>
                Edit Profile
              </Button>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 20, display: 'block' }}>
              {currentUser.firstName} {currentUser.lastName}
            </Text>
            <Text type="secondary" style={{ fontSize: 14 }}>{currentUser.email}</Text>
            {currentUser.bio && !editing && (
              <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: 14, color: '#374151' }}>
                {currentUser.bio}
              </Paragraph>
            )}
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
              Member since {joinDate}
            </Text>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      {editing && (
        <Card title="Edit Profile" style={{ marginBottom: 20 }}>
          <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSave}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="First Name" name="firstName" rules={[{ required: true, message: 'Required.' }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Last Name" name="lastName" rules={[{ required: true, message: 'Required.' }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Avatar URL" name="avatarUrl" extra="Paste a direct image URL">
              <Input placeholder="https://…" />
            </Form.Item>
            <Form.Item label="Bio" name="bio">
              <TextArea rows={3} placeholder="Tell others a bit about yourself…" />
            </Form.Item>
            <Space>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
            </Space>
          </Form>
        </Card>
      )}

      {/* Roles */}
      <Card title="Roles" style={{ marginBottom: 20 }}>
        {currentUser.roles.length === 0 ? (
          <Text type="secondary">No roles assigned.</Text>
        ) : (
          <Space wrap>
            {currentUser.roles.map((role) => (
              <Tag key={role.id} color="blue" style={{ padding: '4px 10px', fontSize: 13 }}>
                {role.label}
              </Tag>
            ))}
          </Space>
        )}
      </Card>

      {/* Account info */}
      <Card title="Account Info">
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Email">{currentUser.email}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={currentUser.status === 'active' ? 'green' : currentUser.status === 'suspended' ? 'red' : 'orange'} style={{ textTransform: 'capitalize' }}>
              {currentUser.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Last Login">
            {currentUser.lastLoginAt ? new Date(currentUser.lastLoginAt).toLocaleString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true,
            }) : 'Never'}
          </Descriptions.Item>
          <Descriptions.Item label="Member Since">{joinDate}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}

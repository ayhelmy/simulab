'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/lib/users';
import { getInstitutionSettings, updateInstitutionSettings, type InstitutionSettings } from '@/lib/institutions';
import {
  Tabs, Form, Input, Button, Switch, Select, InputNumber, Card, Alert,
  Typography, Space, Divider, Row, Col, Spin, App,
} from 'antd';
import { LockOutlined, BellOutlined, BankOutlined, DeleteOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Title, Text } = Typography;

// -- Institution Settings Tab --------------------------------------------------

function InstitutionTab() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<Partial<InstitutionSettings>>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [settingsId, setSettingsId] = useState<string | undefined>();

  useEffect(() => {
    getInstitutionSettings()
      .then((s) => {
        setSettingsId(s.id);
        form.setFieldsValue(s);
      })
      .catch(() => message.error('Failed to load institution settings.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(values: Partial<InstitutionSettings>) {
    setSaving(true);
    try {
      await updateInstitutionSettings(values);
      message.success('Institution settings saved.');
    } catch (err: unknown) {
      const e = err as { title?: string };
      message.error(e.title ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spin size="large" /></div>;
  }

  const tzOptions = [
    'UTC','America/New_York','America/Chicago','America/Los_Angeles',
    'Europe/London','Europe/Paris','Asia/Dubai','Asia/Riyadh',
    'Africa/Cairo','Asia/Kolkata','Asia/Singapore',
  ].map((tz) => ({ value: tz, label: tz }));

  return (
    <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
      {/* Branding */}
      <Card title="Branding" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Institution Name" name="name">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Logo URL" name="logoUrl">
              <Input placeholder="https://…" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Brand Color" name="primaryColor">
              <Input type="color" style={{ height: 38 }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={tzOptions} showSearch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Default Language" name="locale">
              <Select
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'Arabic' },
                  { value: 'fr', label: 'French' },
                  { value: 'es', label: 'Spanish' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Enrollment Policy */}
      <Card title="Enrollment Policy" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Default Enrollment Type" name="enrollmentType">
              <Select
                options={[
                  { value: 'open',     label: 'Open' },
                  { value: 'approval', label: 'Requires approval' },
                  { value: 'code',     label: 'Enrollment code' },
                  { value: 'admin',    label: 'Admin-only' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Default Enrollment Cap (0 = unlimited)" name="enrollmentCap">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Require approval for enrollment requests" name="requireApproval" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>

      {/* Notifications */}
      <Card title="Notification Defaults" size="small" style={{ marginBottom: 16 }}>
        <Form.Item label="Email notifications" name="notificationEmailEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Push notifications" name="notificationPushEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>

      {/* Simulation */}
      <Card title="Simulation Defaults" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Default max attempts per simulation" name="maxSimAttempts">
              <InputNumber min={1} max={99} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Default passing score (%)" name="passScore">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* Auth */}
      <Card title="Authentication" size="small" style={{ marginBottom: 16 }}>
        <Form.Item label="Session duration (days)" name="sessionDurationDays">
          <InputNumber min={1} max={365} style={{ maxWidth: 200 }} />
        </Form.Item>
        <Form.Item label="Require email verification for new accounts" name="requireEmailVerification" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button type="link" onClick={() => router.push(`/institutions/${settingsId}`)}>
          Advanced institution management →
        </Button>
        <Button type="primary" htmlType="submit" loading={saving}>Save Institution Settings</Button>
      </div>
    </Form>
  );
}

// -- Account Tab --------------------------------------------------------------─

function AccountTab() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [pwForm] = Form.useForm();

  const [pwSaving, setPwSaving] = useState(false);

  const [notifs, setNotifs] = useState({
    courseUpdates:  true,
    gradePosted:    true,
    newMessages:    true,
    systemAnnounce: true,
    weeklyDigest:   false,
  });
  const setNotif = (k: keyof typeof notifs) => (v: boolean) => setNotifs((n) => ({ ...n, [k]: v }));

  async function handleChangePassword(values: { current: string; next: string }) {
    if (!user) return;
    setPwSaving(true);
    try {
      await changePassword(user.id, { currentPassword: values.current, newPassword: values.next });
      message.success('Password changed successfully.');
      pwForm.resetFields();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      {/* Change Password */}
      <Card title="Change Password" size="small">
        <Form
          form={pwForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleChangePassword}
          style={{ maxWidth: 480 }}
        >
          <Form.Item
            label="Current Password"
            name="current"
            rules={[{ required: true, message: 'Required.' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="New Password"
            name="next"
            rules={[
              { required: true, message: 'Required.' },
              { min: 8, message: 'Minimum 8 characters.' },
            ]}
            extra="Minimum 8 characters"
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirm New Password"
            name="confirm"
            dependencies={['next']}
            rules={[
              { required: true, message: 'Required.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('next') === value) return Promise.resolve();
                  return Promise.reject('Passwords do not match.');
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={pwSaving}>Update Password</Button>
        </Form>
      </Card>

      {/* Notification Preferences */}
      <Card title="Notification Preferences" size="small">
        {(
          [
            ['courseUpdates',  'Course updates',        'New content, announcements, schedule changes'],
            ['gradePosted',    'Grade posted',           'When an instructor posts or updates a grade'],
            ['newMessages',    'New messages',           'When you receive a new direct message'],
            ['systemAnnounce', 'System announcements',  'Maintenance windows and platform updates'],
            ['weeklyDigest',   'Weekly digest',         'Summary of activity every Monday morning'],
          ] as [keyof typeof notifs, string, string][]
        ).map(([key, label, hint]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <Text style={{ fontSize: 14, fontWeight: 500 }}>{label}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{hint}</Text>
            </div>
            <Switch checked={notifs[key]} onChange={setNotif(key)} />
          </div>
        ))}
        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
          Notification delivery is not yet wired — preferences will be persisted in a future update.
        </Text>
      </Card>

      {/* Danger zone */}
      <Card title="Account" size="small">
        <Alert
          type="error"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Delete account</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Permanently removes your account and all associated data</Text>
              </div>
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => message.warning('Account deletion must be requested through your institution admin.')}
              >
                Delete Account
              </Button>
            </div>
          }
          showIcon={false}
        />
      </Card>
    </Space>
  );
}

// -- Main Page ----------------------------------------------------------------─

export default function SettingsPage() {
  const { user } = useAuth();
  const canManageInstitution = user?.permissions.includes('institutions.manage_own') || user?.permissions.includes('platform.settings.manage');

  if (!user) return null;

  const tabItems = [
    {
      key: 'account',
      label: <span><LockOutlined /> Account</span>,
      children: <AccountTab />,
    },
    ...(canManageInstitution ? [{
      key: 'institution',
      label: <span><BankOutlined /> Institution</span>,
      children: <InstitutionTab />,
    }] : []),
  ];

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <PageHeader
        title="Settings"
        subtitle={canManageInstitution
          ? 'Manage your account and institution settings'
          : 'Manage your account security and preferences'
        }
      />
      <Tabs items={tabItems} />
    </div>
  );
}

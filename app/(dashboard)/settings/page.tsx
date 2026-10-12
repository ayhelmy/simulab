'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/lib/users';
import { getInstitutionSettings, updateInstitutionSettings, type InstitutionSettings } from '@/lib/institutions';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notifications';
import type { NotificationPreferenceCategory, NotificationPreferences } from '@/types';
import {
  Tabs, Form, Input, Button, Switch, Select, InputNumber, Avatar,
  Row, Col, Skeleton, App,
} from 'antd';
import {
  LockOutlined, BellOutlined, BankOutlined, DeleteOutlined, UserOutlined,
  WarningOutlined, ExperimentOutlined, SafetyOutlined, BgColorsOutlined, TeamOutlined,
} from '@ant-design/icons';
import { Chip } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminHeader, AdminCard, LoadErrorState,
} from '@/components/admin/adminUi';

/** Card-shaped placeholders that mirror the real layout (§21.10). */
function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <AdminCard>
      <Skeleton active title={{ width: 180 }} paragraph={{ rows }} />
    </AdminCard>
  );
}

function SettingRow({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div className={a.settingRow}>
      <div style={{ minWidth: 0 }}>
        <span className={a.settingLabel}>{label}</span>
        {hint && <span className={a.settingHint}>{hint}</span>}
      </div>
      {control}
    </div>
  );
}

// -- Institution Settings Tab --------------------------------------------------

function InstitutionTab() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<Partial<InstitutionSettings>>();

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [settingsId, setSettingsId] = useState<string | undefined>();

  function fetchSettings() {
    getInstitutionSettings()
      .then((s) => {
        setSettingsId(s.id);
        form.setFieldsValue(s);
      })
      .catch(() => {
        setLoadFailed(true);
        message.error('Failed to load institution settings.');
      })
      .finally(() => setLoading(false));
  }

  function load() {
    setLoading(true);
    setLoadFailed(false);
    fetchSettings();
  }

  useEffect(() => {
    fetchSettings();
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
    return <><CardSkeleton rows={4} /><CardSkeleton /><CardSkeleton rows={2} /></>;
  }

  if (loadFailed) {
    return (
      <AdminCard>
        <LoadErrorState
          title="Could not load institution settings"
          text="Institution settings could not be loaded. Try again or check the system connection."
          onRetry={load}
        />
      </AdminCard>
    );
  }

  const tzOptions = [
    'UTC','America/New_York','America/Chicago','America/Los_Angeles',
    'Europe/London','Europe/Paris','Asia/Dubai','Asia/Riyadh',
    'Africa/Cairo','Asia/Kolkata','Asia/Singapore',
  ].map((tz) => ({ value: tz, label: tz }));

  return (
    <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
      <AdminCard title="Branding & Locale" icon={<BgColorsOutlined />} helper="How the institution appears to its users">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Institution Name" name="name">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Logo URL" name="logoUrl" extra="A square image works best (at least 128 × 128 px).">
              <Input placeholder="https://…" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Brand Color" name="primaryColor">
              <Input type="color" style={{ height: 38, maxWidth: 120 }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={tzOptions} showSearch />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Default Language" name="locale" style={{ marginBottom: 0 }}>
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
      </AdminCard>

      <AdminCard title="Enrollment Policy" icon={<TeamOutlined />} helper="Defaults for new courses">
        <Row gutter={16}>
          <Col xs={24} md={12}>
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
          <Col xs={24} md={12}>
            <Form.Item label="Default Enrollment Cap" name="enrollmentCap" extra="0 means unlimited.">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Require approval for enrollment requests" name="requireApproval" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Switch />
        </Form.Item>
      </AdminCard>

      <AdminCard title="Notification Defaults" icon={<BellOutlined />} helper="Channels enabled for the institution's users">
        <Row gutter={16}>
          <Col xs={12}>
            <Form.Item label="Email notifications" name="notificationEmailEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item label="Push notifications" name="notificationPushEnabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </AdminCard>

      <AdminCard title="Simulation Defaults" icon={<ExperimentOutlined />} helper="Applied when a simulation does not set its own values">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Default max attempts per simulation" name="maxSimAttempts" style={{ marginBottom: 0 }}>
              <InputNumber min={1} max={99} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Default passing score (%)" name="passScore" style={{ marginBottom: 0 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </AdminCard>

      <AdminCard title="Authentication" icon={<SafetyOutlined />}>
        <Form.Item label="Session duration (days)" name="sessionDurationDays" extra="How long users stay signed in before they must sign in again.">
          <InputNumber min={1} max={365} style={{ maxWidth: 200, width: '100%' }} />
        </Form.Item>
        <Form.Item label="Require email verification for new accounts" name="requireEmailVerification" valuePropName="checked" style={{ marginBottom: 0 }}>
          <Switch />
        </Form.Item>
      </AdminCard>

      <div className={a.formFooter}>
        <Button type="link" style={{ paddingInline: 0 }} onClick={() => router.push(`/institutions/${settingsId}`)}>
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

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  function fetchPrefs() {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => message.error('Failed to load notification preferences.'))
      .finally(() => setPrefsLoading(false));
  }

  function retryPrefs() {
    setPrefsLoading(true);
    fetchPrefs();
  }

  useEffect(() => {
    fetchPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePrefs(partial: Partial<NotificationPreferences>) {
    if (!prefs) return;
    const next = { ...prefs, ...partial };
    setPrefs(next);
    setPrefsSaving(true);
    try {
      const saved = await updateNotificationPreferences({
        emailEnabled: next.emailEnabled,
        inAppEnabled: next.inAppEnabled,
        pushEnabled: next.pushEnabled,
        digestFrequency: next.digestFrequency,
        preferences: next.preferences,
      });
      setPrefs(saved);
    } catch {
      message.error('Failed to save notification preferences.');
    } finally {
      setPrefsSaving(false);
    }
  }

  function setCategory(key: NotificationPreferenceCategory, value: boolean) {
    if (!prefs) return;
    savePrefs({ preferences: { ...prefs.preferences, [key]: value } });
  }

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

  if (!user) return null;

  return (
    <>
      {/* Account settings */}
      <AdminCard
        title="Account Settings"
        icon={<UserOutlined />}
        extra={<Link href="/profile"><Button size="small">Edit Profile</Button></Link>}
      >
        <div className={a.cell} style={{ alignItems: 'flex-start' }}>
          <Avatar size={48} src={user.avatarUrl} style={{ background: '#F59324', fontWeight: 700, flexShrink: 0 }}>
            {!user.avatarUrl && `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <span className={a.cellTitle}>{user.firstName} {user.lastName}</span>
            <span className={a.cellSub} style={{ overflowWrap: 'anywhere' }}>{user.email}</span>
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {user.roles.map((r) => <Chip key={r.id} tone="info">{r.label}</Chip>)}
            </span>
          </div>
        </div>
      </AdminCard>

      {/* Password */}
      <AdminCard title="Password" icon={<LockOutlined />} helper="Change the password you use to sign in. Use at least 8 characters.">
        <Form
          form={pwForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleChangePassword}
          style={{ maxWidth: 440 }}
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
      </AdminCard>

      {/* Notification Preferences */}
      <AdminCard title="Notification Preferences" icon={<BellOutlined />} helper="Changes save automatically">
        {prefsLoading ? (
          <Skeleton active title={false} paragraph={{ rows: 6 }} />
        ) : !prefs ? (
          <LoadErrorState
            compact
            title="Could not load notification preferences"
            text="Your notification preferences could not be loaded. Your current settings are unchanged."
            onRetry={retryPrefs}
          />
        ) : (
          <>
            <span className={a.settingGroupLabel} style={{ marginTop: 0 }}>Delivery</span>
            <SettingRow
              label="In-app notifications"
              hint="Show notifications in the bell and notifications page"
              control={<Switch checked={prefs.inAppEnabled} loading={prefsSaving} onChange={(v) => savePrefs({ inAppEnabled: v })} />}
            />
            <SettingRow
              label="Email notifications"
              hint="Receive high-priority updates by email"
              control={<Switch checked={prefs.emailEnabled} loading={prefsSaving} onChange={(v) => savePrefs({ emailEnabled: v })} />}
            />
            <SettingRow
              label="Digest frequency"
              hint="How often to bundle non-urgent updates"
              control={
                <Select
                  value={prefs.digestFrequency}
                  style={{ width: 140 }}
                  aria-label="Digest frequency"
                  onChange={(v) => savePrefs({ digestFrequency: v })}
                  options={[
                    { value: 'instant', label: 'Instant' },
                    { value: 'daily',   label: 'Daily' },
                    { value: 'weekly',  label: 'Weekly' },
                    { value: 'off',     label: 'Off' },
                  ]}
                />
              }
            />

            <span className={a.settingGroupLabel}>Categories</span>
            {(
              [
                ['system_alerts',         'System alerts',         'Platform and maintenance notices'],
                ['messages',              'Messages',              'New direct and course messages'],
                ['course_announcements',  'Course announcements',  'Instructor announcements in your courses'],
                ['enrollment_updates',    'Enrollment updates',    'Enrollment confirmed, approved, or rejected'],
                ['quiz_updates',          'Quiz updates',          'New quizzes and manual-grading requests'],
                ['grade_updates',         'Grade updates',         'When a grade is posted or overridden'],
                ['simulation_updates',    'Simulation updates',    'When a simulation activity is completed'],
              ] as [NotificationPreferenceCategory, string, string][]
            ).map(([key, label, hint]) => (
              <SettingRow
                key={key}
                label={label}
                hint={hint}
                control={<Switch checked={prefs.preferences[key]} loading={prefsSaving} onChange={(v) => setCategory(key, v)} />}
              />
            ))}
          </>
        )}
      </AdminCard>

      {/* Danger zone — visually separated */}
      <AdminCard title="Danger Zone" icon={<WarningOutlined />} className={a.danger} style={{ marginTop: 32 }}>
        <SettingRow
          label="Delete account"
          hint="Permanently removes your account and all associated data. This cannot be undone."
          control={
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => message.warning('Account deletion must be requested through your institution admin.')}
            >
              Delete Account
            </Button>
          }
        />
      </AdminCard>
    </>
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
      label: <span><UserOutlined /> Account</span>,
      children: <AccountTab />,
    },
    ...(canManageInstitution ? [{
      key: 'institution',
      label: <span><BankOutlined /> Institution</span>,
      children: <InstitutionTab />,
    }] : []),
  ];

  return (
    <div className={ADMIN_PAGE_CLASS} style={{ maxWidth: 860, margin: '0 auto' }}>
      <AdminHeader
        eyebrow={null}
        title="Settings"
        subtitle={canManageInstitution
          ? 'Manage your account, password, notifications, and institution settings.'
          : 'Manage your account security and preferences.'}
      />
      <Tabs items={tabItems} />
    </div>
  );
}

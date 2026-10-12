'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import {
  Table, Button, Input, Select, Typography, Modal, Drawer, Form,
  Row, Col, Alert, App, Popconfirm, Space, Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  PlusOutlined, ApiOutlined, KeyOutlined, ReloadOutlined,
  DeleteOutlined, HistoryOutlined, InfoCircleOutlined, SettingOutlined,
} from '@ant-design/icons';
import { Chip } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as adm, AdminHeader, AdminCard, Toolbar, ResultCount,
  StatusChip, StateBlock, LoadErrorState, formatWhen, statusLabel,
} from '@/components/admin/adminUi';
import {
  listLtiPlatforms, createLtiPlatform, getLtiPlatform, updateLtiPlatform,
  activateLtiPlatform, deactivateLtiPlatform, addLtiDeployment, removeLtiDeployment,
  listLtiKeys, rotateLtiKey, listLtiLaunchLogs,
  type CreateLtiPlatformData, type LtiLaunchLog,
} from '@/lib/lti';
import { listInstitutions, type InstitutionDetail } from '@/lib/institutions';
import type { LtiPlatform, LtiPlatformDetail, LtiToolKey } from '@/types';

const { Search } = Input;
const { Text } = Typography;

function errMsg(err: unknown, fallback: string): string {
  const e = err as { title?: string; detail?: string };
  return e.detail ?? e.title ?? fallback;
}

// ── Create Modal ───────────────────────────────────────────────────────────────

function CreatePlatformModal({ isSuperAdmin, onClose, onSuccess }: {
  isSuperAdmin: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [form] = Form.useForm<CreateLtiPlatformData>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionDetail[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    listInstitutions({ limit: 100 }).then((r) => setInstitutions(r.institutions)).catch(() => {});
  }, [isSuperAdmin]);

  async function handleFinish(values: CreateLtiPlatformData) {
    setSaving(true); setError(null);
    try {
      await createLtiPlatform(values);
      onSuccess();
    } catch (err: unknown) {
      setError(errMsg(err, 'Failed to register platform'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={<><ApiOutlined /> Register LMS Platform</>}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Register"
      confirmLoading={saving}
      width={560}
      destroyOnHidden
    >
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
        {isSuperAdmin && (
          <Form.Item label="Institution" name="institutionId" rules={[{ required: true, message: 'Required.' }]}>
            <Select
              placeholder="Select institution"
              showSearch
              optionFilterProp="label"
              options={institutions.map((i) => ({ value: i.id, label: i.name }))}
            />
          </Form.Item>
        )}
        <Form.Item label="Platform Name" name="platformName" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="e.g. Moodle — Fall 2026" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Issuer (iss)" name="issuer" rules={[{ required: true, message: 'Required.' }]}>
              <Input placeholder="https://lms.example.edu" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Client ID" name="clientId" rules={[{ required: true, message: 'Required.' }]}>
              <Input placeholder="client-id-from-lms" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Authorization / Login URL" name="authLoginUrl" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="https://lms.example.edu/mod/lti/auth.php" />
        </Form.Item>
        <Form.Item label="Token URL" name="authTokenUrl" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="https://lms.example.edu/mod/lti/token.php" />
        </Form.Item>
        <Form.Item label="JWKS URL" name="jwksUrl" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="https://lms.example.edu/mod/lti/certs.php" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ── Manage Drawer (edit + deployments) ─────────────────────────────────────────

function ManageDrawer({ platformId, onClose, onChanged }: {
  platformId: string; onClose: () => void; onChanged: () => void;
}) {
  const { message } = App.useApp();
  const [detail, setDetail] = useState<LtiPlatformDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [depForm] = Form.useForm<{ deploymentId: string; label?: string }>();
  const [addingDep, setAddingDep] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getLtiPlatform(platformId);
      setDetail(d);
      form.setFieldsValue(d);
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to load platform'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(values: Partial<LtiPlatform>) {
    setSaving(true);
    try {
      await updateLtiPlatform(platformId, values);
      message.success('Platform updated');
      onChanged();
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to update platform'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!detail) return;
    try {
      if (detail.status === 'active') await deactivateLtiPlatform(platformId);
      else await activateLtiPlatform(platformId);
      message.success('Status updated');
      onChanged();
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to update status'));
    }
  }

  async function handleAddDeployment(values: { deploymentId: string; label?: string }) {
    setAddingDep(true);
    try {
      await addLtiDeployment(platformId, values);
      depForm.resetFields();
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to add deployment'));
    } finally {
      setAddingDep(false);
    }
  }

  async function handleRemoveDeployment(deploymentId: string) {
    try {
      await removeLtiDeployment(platformId, deploymentId);
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to remove deployment'));
    }
  }

  return (
    <Drawer open title={detail?.platformName ?? 'LTI Platform'} size={520} onClose={onClose} loading={loading}>
      {detail && (
        // Drawers render into <body>; the wrapper carries the chip / state tokens.
        <div className={ADMIN_PAGE_CLASS}>
          <Space style={{ marginBottom: 16 }}>
            <StatusChip status={detail.status} />
            <Button size="small" onClick={toggleStatus}>
              {detail.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          </Space>

          <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSave}>
            <Form.Item label="Platform Name" name="platformName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Issuer (iss)" name="issuer" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Client ID" name="clientId" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Authorization / Login URL" name="authLoginUrl" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Token URL" name="authTokenUrl" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="JWKS URL" name="jwksUrl" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Save Changes</Button>
          </Form>

          <Typography.Title level={5} style={{ marginTop: 24 }}>Deployments</Typography.Title>
          {detail.deployments.length === 0 && (
            <StateBlock compact title="No deployments yet" text="Add the deployment ID from the LMS so launches from it are accepted." />
          )}
          {detail.deployments.map((dep) => (
            <div key={dep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <Text strong>{dep.deploymentId}</Text>
                {dep.label && <Text type="secondary" style={{ marginLeft: 8 }}>{dep.label}</Text>}
              </div>
              <Popconfirm title="Remove this deployment?" onConfirm={() => handleRemoveDeployment(dep.deploymentId)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          ))}

          <Form form={depForm} layout="inline" style={{ marginTop: 12 }} onFinish={handleAddDeployment}>
            <Form.Item name="deploymentId" rules={[{ required: true, message: 'Required' }]} style={{ flex: 1 }}>
              <Input placeholder="Deployment ID" />
            </Form.Item>
            <Form.Item name="label">
              <Input placeholder="Label (optional)" />
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit" loading={addingDep}>Add</Button>
            </Form.Item>
          </Form>
        </div>
      )}
    </Drawer>
  );
}

// ── Tool Keys Card ──────────────────────────────────────────────────────────────

function ToolKeysCard() {
  const { message } = App.useApp();
  const [keys, setKeys] = useState<LtiToolKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setKeys(await listLtiKeys());
    } catch (err: unknown) {
      setLoadError(errMsg(err, 'Failed to load signing keys'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRotate() {
    setRotating(true);
    try {
      await rotateLtiKey();
      message.success('Signing key rotated');
      load();
    } catch (err: unknown) {
      message.error(errMsg(err, 'Failed to rotate key'));
    } finally {
      setRotating(false);
    }
  }

  const columns: TableColumnsType<LtiToolKey> = [
    { title: 'Key ID', dataIndex: 'kid', key: 'kid', render: (v: string) => <span className={adm.mono}>{v}</span> },
    {
      title: 'Fingerprint', dataIndex: 'fingerprint', key: 'fingerprint',
      render: (v: string) => <Tooltip title={v}><span className={adm.mono}>{v.slice(0, 16)}…</span></Tooltip>,
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <StatusChip status={s} /> },
    {
      title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 150,
      render: (v: string) => <span style={{ whiteSpace: 'nowrap' }} title={new Date(v).toLocaleString()}>{formatWhen(v)}</span>,
    },
  ];

  return (
    <AdminCard
      id="lti-keys"
      title="Tool Signing Keys"
      icon={<KeyOutlined />}
      helper="BEDO signs LTI messages with the active key; LMS platforms verify them with the published keys."
      extra={
        <Popconfirm
          title="Rotate signing key?"
          description="A new active key is generated; the previous key stays published (retired) so in-flight platforms can still verify it."
          onConfirm={handleRotate}
        >
          <Button icon={<ReloadOutlined />} loading={rotating}>Rotate Key</Button>
        </Popconfirm>
      }
      flush
    >
      {loadError ? (
        <LoadErrorState compact title="Could not load signing keys" text="The tool signing keys could not be loaded." detail={loadError} onRetry={load} />
      ) : (
        <Table
          dataSource={keys}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: 560 }}
          locale={{ emptyText: loading ? ' ' : <StateBlock compact icon={<KeyOutlined />} title="No signing keys yet" text="Rotate the key to generate the first active signing key." /> }}
        />
      )}
    </AdminCard>
  );
}

// ── Launch Logs Card ────────────────────────────────────────────────────────────

const LAUNCH_EVENT: Record<string, { label: string; ok: boolean }> = {
  'lti.launch_success': { label: 'Launch', ok: true },
  'lti.launch_failed': { label: 'Launch', ok: false },
  'lti.login_failed': { label: 'Login', ok: false },
};

function eventLabel(action: string): string {
  return LAUNCH_EVENT[action]?.label ?? statusLabel(action.replace(/^lti\./, ''));
}

function LaunchLogsCard() {
  const [logs, setLogs] = useState<LtiLaunchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    listLtiLaunchLogs({ limit: 20 })
      .then((r) => setLogs(r.logs))
      .catch((err: unknown) => setLoadError(errMsg(err, 'Failed to load launch attempts')))
      .finally(() => setLoading(false));
  }, []);

  const load = () => { setLoading(true); setLoadError(null); fetchLogs(); };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns: TableColumnsType<LtiLaunchLog> = [
    {
      title: 'Time', dataIndex: 'occurredAt', key: 'occurredAt', width: 140,
      render: (v: string) => <span style={{ whiteSpace: 'nowrap' }} title={new Date(v).toLocaleString()}>{formatWhen(v)}</span>,
    },
    { title: 'Event', dataIndex: 'action', key: 'action', width: 120, render: (act: string) => <span className={adm.cellTitle} style={{ fontSize: 13, fontWeight: 500 }}>{eventLabel(act)}</span> },
    { title: 'Actor', dataIndex: 'actorEmail', key: 'actorEmail', render: (v: string | null) => v ?? <span className={adm.muted}>—</span> },
    {
      title: 'Details', key: 'delta',
      render: (_, log) => log.delta
        ? <span className={adm.cellSub} style={{ overflowWrap: 'anywhere' }}>{Object.entries(log.delta).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</span>
        : <span className={adm.muted}>—</span>,
    },
    {
      title: 'Status', dataIndex: 'action', key: 'status', width: 110,
      render: (act: string) => {
        const meta = LAUNCH_EVENT[act];
        if (!meta) return <Chip tone="info">Logged</Chip>;
        return meta.ok ? <Chip tone="success">Success</Chip> : <Chip tone="error">Failed</Chip>;
      },
    },
  ];

  return (
    <AdminCard
      id="lti-launches"
      title="Recent Launch Attempts"
      icon={<HistoryOutlined />}
      helper="The latest 20 LTI logins and launches from registered platforms"
      extra={<Tooltip title="Refresh"><Button size="small" icon={<ReloadOutlined />} aria-label="Refresh launch attempts" onClick={load} /></Tooltip>}
      flush
    >
      {loadError ? (
        <LoadErrorState compact title="Could not load launch attempts" text="Recent LTI launch attempts could not be loaded." detail={loadError} onRetry={load} />
      ) : (
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: 760 }}
          locale={{ emptyText: loading ? ' ' : <StateBlock compact icon={<HistoryOutlined />} title="No launch attempts yet" text="Launches from registered LMS platforms will appear here." /> }}
        />
      )}
    </AdminCard>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LtiSettingsPage() {
  const allowed = useRouteGuard('lti_platforms.view_own', 'lti_platforms.view_all');
  const { hasPermission } = useAuth();
  const isSuperAdmin = hasPermission('lti_platforms.view_all');

  const [platforms, setPlatforms] = useState<LtiPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [managePlatformId, setManagePlatformId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await listLtiPlatforms({ search: search || undefined, limit: 50 });
      setPlatforms(r.platforms);
    } catch (err: unknown) {
      setLoadError(errMsg(err, 'Failed to load LTI platforms'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const columns: TableColumnsType<LtiPlatform> = [
    {
      title: 'Platform', dataIndex: 'platformName', key: 'platformName',
      render: (v: string, p) => (
        <a className={adm.cellTitle} href="#" onClick={(e) => { e.preventDefault(); setManagePlatformId(p.id); }}>{v}</a>
      ),
    },
    {
      title: 'Issuer', dataIndex: 'issuer', key: 'issuer', ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span></Tooltip>,
    },
    {
      title: 'Client ID', dataIndex: 'clientId', key: 'clientId', width: 200, ellipsis: { showTitle: false },
      render: (v: string) => <Tooltip title={v}><span className={adm.mono}>{v}</span></Tooltip>,
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s: string) => <StatusChip status={s} /> },
    {
      // The platform list does not report launches; last launches are in Recent Launch Attempts below.
      title: 'Last updated', dataIndex: 'updatedAt', key: 'updatedAt', width: 140,
      render: (v: string) => v ? <span style={{ whiteSpace: 'nowrap' }} title={new Date(v).toLocaleString()}>{formatWhen(v)}</span> : <span className={adm.muted}>—</span>,
    },
    {
      title: 'Actions', key: 'actions', width: 110, align: 'right', fixed: 'right',
      render: (_, p) => <Button size="small" icon={<SettingOutlined />} onClick={() => setManagePlatformId(p.id)}>Manage</Button>,
    },
  ];

  if (!allowed) return null;

  const emptyState = search ? (
    <StateBlock
      kind="no-match"
      title="No platforms match your search"
      text="Try a different platform name or issuer."
      actions={<Button onClick={() => { setSearch(''); setSearchText(''); }}>Clear search</Button>}
    />
  ) : (
    <StateBlock
      icon={<ApiOutlined />}
      title="No platforms registered yet"
      text="Register an LMS platform to enable LTI launches."
      actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>Register Platform</Button>}
    />
  );

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        title="LTI Integration"
        subtitle="Register LMS platforms as LTI 1.3 tools and manage signing keys, launches, and recent attempts."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            Register Platform
          </Button>
        }
      />

      <div className={adm.note}>
        <InfoCircleOutlined />
        <span>
          <strong>LTI allows institutions to launch BEDO simulations from their LMS.</strong>{' '}
          Register each LMS as a platform, add its deployment IDs, and keep the tool signing key current.
        </span>
      </div>

      <AdminCard
        id="lti-platforms"
        title="Registered Platforms"
        icon={<ApiOutlined />}
        flush
        toolbar={
          <Toolbar
            search={
              <Search
                placeholder="Search by platform name or issuer"
                aria-label="Search platforms by name or issuer"
                allowClear
                value={searchText}
                onSearch={setSearch}
                onChange={(e) => { setSearchText(e.target.value); if (!e.target.value) setSearch(''); }}
              />
            }
            end={
              <>
                {!loadError && !loading && <ResultCount total={platforms.length} noun="platform" />}
                <Tooltip title="Refresh">
                  <Button icon={<ReloadOutlined />} aria-label="Refresh platforms" onClick={load} />
                </Tooltip>
              </>
            }
          />
        }
      >
        {loadError ? (
          <LoadErrorState
            title="Could not load LTI platforms"
            text="Registered platforms could not be loaded. Try again or check the system connection."
            detail={loadError}
            onRetry={load}
          />
        ) : (
          <Table
            dataSource={platforms}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="middle"
            scroll={{ x: 820 }}
            pagination={platforms.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
            locale={{ emptyText: loading ? ' ' : emptyState }}
          />
        )}
      </AdminCard>

      <ToolKeysCard />
      <LaunchLogsCard />

      {showCreate && (
        <CreatePlatformModal
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); load(); }}
        />
      )}

      {managePlatformId && (
        <ManageDrawer
          platformId={managePlatformId}
          onClose={() => setManagePlatformId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

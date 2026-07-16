'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Table, Card, Button, Input, Select, Tag, Avatar, Typography,
  Modal, Form, Row, Col, InputNumber, Spin, Alert, App,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, BankOutlined } from '@ant-design/icons';
import {
  listInstitutions, createInstitution,
  type InstitutionDetail, type CreateInstitutionData,
} from '@/lib/institutions';
import type { PaginationMeta } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';

const { Search } = Input;
const { Text }   = Typography;

const PLAN_COLOR: Record<string, string> = {
  trial: 'default', starter: 'green', professional: 'blue', enterprise: 'purple',
};

const TIMEZONE_OPTIONS = [
  'UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'Europe/London','Europe/Paris','Asia/Dubai','Asia/Riyadh','Africa/Cairo','Asia/Kolkata','Asia/Singapore',
].map(tz => ({ value: tz, label: tz }));

// -- Create Modal --------------------------------------------------------------

function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (inst: InstitutionDetail) => void }) {
  const [form]  = Form.useForm<CreateInstitutionData & { maxUsers: number }>();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleFinish(values: CreateInstitutionData & { maxUsers: number }) {
    setSaving(true); setError(null);
    try {
      const inst = await createInstitution({
        ...values,
        slug:    values.slug    || undefined,
        domain:  values.domain  || undefined,
        maxUsers: Number(values.maxUsers),
      });
      onSuccess(inst);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to create institution');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={<><BankOutlined /> Create Institution</>}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Create"
      confirmLoading={saving}
      width={520}
      destroyOnHidden
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ primaryColor: '#F59324', timezone: 'UTC', locale: 'en', subscriptionPlan: 'trial', maxUsers: 100 }}
        onFinish={handleFinish}
      >
        <Form.Item label="Institution Name" name="name" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="e.g. Demo University" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Slug (optional)" name="slug" extra="Auto-generated if empty.">
              <Input placeholder="cairo-university" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Email Domain (optional)" name="domain">
              <Input placeholder="university.edu" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Plan" name="subscriptionPlan">
              <Select options={[
                { value: 'trial', label: 'Trial' },
                { value: 'starter', label: 'Starter' },
                { value: 'professional', label: 'Professional' },
                { value: 'enterprise', label: 'Enterprise' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Max Users" name="maxUsers">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={TIMEZONE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Language" name="locale">
              <Select options={[
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'Arabic' },
                { value: 'fr', label: 'French' },
                { value: 'es', label: 'Spanish' },
              ]} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Brand Color" name="primaryColor">
          <Input type="color" style={{ width: 60, padding: 2 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Main Page ----------------------------------------------------------------─

export default function InstitutionsPage() {
  const allowed = useRouteGuard('institutions.view_all', 'institutions.view_own');
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();

  // institution_admin has view_own but not view_all — redirect to their institution directly
  const canViewAll = hasPermission('institutions.view_all');

  useEffect(() => {
    if (!allowed || !user) return;
    if (!canViewAll && user.institutionId) {
      router.replace(`/institutions/${user.institutionId}`);
    }
  }, [allowed, canViewAll, user, router]);

  const [institutions, setInstitutions] = useState<InstitutionDetail[]>([]);
  const [meta,         setMeta]         = useState<PaginationMeta | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page,         setPage]         = useState(1);
  const [showCreate,   setShowCreate]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await listInstitutions({
        page, limit: 15,
        search: search || undefined,
        status: (statusFilter as 'active' | 'suspended') || undefined,
      });
      setInstitutions(r.institutions);
      setMeta(r.meta);
    } catch (err: unknown) {
      const e = err as { title?: string };
      setError(e.title ?? 'Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const columns: TableColumnsType<InstitutionDetail> = [
    {
      title: 'Institution',
      key: 'name',
      render: (_, inst) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            src={inst.logoUrl}
            style={{ background: inst.primaryColor ?? '#F59324', flexShrink: 0, fontWeight: 700 }}
          >
            {!inst.logoUrl && inst.name[0].toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: 'block', fontSize: 14 }}>{inst.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{inst.domain ?? inst.slug}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Plan',
      dataIndex: 'subscriptionPlan',
      key: 'plan',
      width: 110,
      render: (plan: string) => (
        <Tag color={PLAN_COLOR[plan] ?? 'default'} style={{ textTransform: 'capitalize' }}>{plan}</Tag>
      ),
    },
    {
      title: 'Users',
      dataIndex: 'userCount',
      key: 'users',
      width: 80,
      align: 'center',
      render: (v: number | undefined) => v ?? '—',
    },
    {
      title: 'Depts',
      dataIndex: 'deptCount',
      key: 'depts',
      width: 80,
      align: 'center',
      render: (v: number | undefined) => v ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_, inst) => (
        <Button size="small" onClick={() => router.push(`/institutions/${inst.id}`)}>Manage</Button>
      ),
    },
  ];

  if (!allowed) return null;

  // Render spinner while the redirect to own institution fires
  if (!canViewAll) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Institutions"
        subtitle={meta ? `${meta.total} institution${meta.total !== 1 ? 's' : ''} on platform` : undefined}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            New Institution
          </Button>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col flex="1 1 240px">
          <Search
            placeholder="Search by name or slug…"
            allowClear
            onSearch={(v) => { setSearch(v); setPage(1); }}
            onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } }}
          />
        </Col>
        <Col flex="0 0 160px">
          <Select
            placeholder="All Statuses"
            allowClear
            style={{ width: '100%' }}
            onChange={(v: string | undefined) => { setStatusFilter(v); setPage(1); }}
            options={[
              { value: 'active',    label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </Col>
      </Row>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <Card>
        <Table
          dataSource={institutions}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 600 }}
          pagination={{
            current: page,
            total: meta?.total ?? 0,
            pageSize: 15,
            showSizeChanger: false,
            onChange: (p) => setPage(p),
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
          }}
        />
      </Card>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={(inst) => { setShowCreate(false); router.push(`/institutions/${inst.id}`); }}
        />
      )}
    </div>
  );
}

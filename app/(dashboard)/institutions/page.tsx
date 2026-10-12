'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Table, Button, Input, Select, Avatar, Tooltip,
  Modal, Form, Row, Col, InputNumber, Spin, Alert, App,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, BankOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import {
  listInstitutions, createInstitution,
  type InstitutionDetail, type CreateInstitutionData,
} from '@/lib/institutions';
import type { PaginationMeta } from '@/types/api';
import { Chip, type ChipTone } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminHeader, AdminCard, Toolbar, ToolbarFilter,
  ResultCount, StatusChip, StateBlock, LoadErrorState, statusLabel,
} from '@/components/admin/adminUi';

const { Search } = Input;

/** Plan is account information, not a state — neutral/blue, never orange. */
const PLAN_TONE: Record<string, ChipTone> = {
  trial: 'neutral', starter: 'info', professional: 'info', enterprise: 'info',
};

const PAGE_SIZE = 15;

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
  const [searchText,   setSearchText]   = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page,         setPage]         = useState(1);
  const [showCreate,   setShowCreate]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await listInstitutions({
        page, limit: PAGE_SIZE,
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

  const count = (v: number | undefined) => v != null
    ? <span className={a.numeric}>{v.toLocaleString()}</span>
    : <span className={a.muted}>—</span>;

  const planChip = (plan: string | undefined) => plan
    ? <Chip tone={PLAN_TONE[plan] ?? 'neutral'}>{statusLabel(plan)}</Chip>
    : <span className={a.muted}>—</span>;

  const logo = (inst: InstitutionDetail) => (
    <Avatar
      size={36}
      src={inst.logoUrl}
      style={{ background: inst.primaryColor ?? '#F59324', flexShrink: 0, fontWeight: 700 }}
    >
      {!inst.logoUrl && inst.name[0].toUpperCase()}
    </Avatar>
  );

  const columns: TableColumnsType<InstitutionDetail> = [
    {
      title: 'Institution',
      key: 'name',
      render: (_, inst) => (
        <div className={a.cell}>
          {logo(inst)}
          <div style={{ minWidth: 0 }}>
            <a className={a.cellTitle} href={`/institutions/${inst.id}`} onClick={(e) => { e.preventDefault(); router.push(`/institutions/${inst.id}`); }}>
              {inst.name}
            </a>
            <span className={a.cellSub}>{inst.domain ?? inst.slug}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Plan',
      dataIndex: 'subscriptionPlan',
      key: 'plan',
      width: 130,
      render: (plan: string) => planChip(plan),
    },
    {
      title: 'Users',
      dataIndex: 'userCount',
      key: 'users',
      width: 90,
      align: 'right',
      render: count,
    },
    {
      title: 'Departments',
      dataIndex: 'deptCount',
      key: 'depts',
      width: 120,
      align: 'right',
      render: count,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => <StatusChip status={s} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      align: 'right',
      fixed: 'right',
      render: (_, inst) => (
        <Button size="small" icon={<SettingOutlined />} onClick={() => router.push(`/institutions/${inst.id}`)}>Manage</Button>
      ),
    },
  ];

  const hasFilters = !!(search || statusFilter);
  function clearFilters() {
    setSearch(''); setSearchText(''); setStatusFilter(undefined); setPage(1);
  }

  const emptyState = hasFilters ? (
    <StateBlock
      kind="no-match"
      title="No institutions match your filters"
      text="Try a different name or slug, or clear the status filter."
      actions={<Button onClick={clearFilters}>Clear filters</Button>}
    />
  ) : (
    <StateBlock
      icon={<BankOutlined />}
      title="No institutions yet"
      text="Create the first institution to start assigning users, departments, and simulation catalogs."
      actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>New Institution</Button>}
    />
  );

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
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        title="Institutions"
        subtitle="Manage institutions, access status, users, departments, and assigned simulation catalogs."
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
            New Institution
          </Button>
        }
      />

      <AdminCard
        flush
        toolbar={
          <Toolbar
            search={
              <Search
                placeholder="Search by name or slug"
                aria-label="Search institutions by name or slug"
                allowClear
                value={searchText}
                onSearch={(v) => { setSearch(v); setPage(1); }}
                onChange={(e) => { setSearchText(e.target.value); if (!e.target.value) { setSearch(''); setPage(1); } }}
              />
            }
            filters={
              <>
                <ToolbarFilter>
                  <Select
                    placeholder="All statuses"
                    aria-label="Filter by status"
                    allowClear
                    value={statusFilter}
                    style={{ width: '100%' }}
                    onChange={(v: string | undefined) => { setStatusFilter(v); setPage(1); }}
                    options={[
                      { value: 'active',    label: 'Active' },
                      { value: 'suspended', label: 'Suspended' },
                    ]}
                  />
                </ToolbarFilter>
                {statusFilter && <Button type="link" onClick={() => { setStatusFilter(undefined); setPage(1); }} style={{ paddingInline: 4 }}>Clear filter</Button>}
              </>
            }
            end={
              <>
                {!error && <ResultCount total={meta?.total} noun="institution" />}
                <Tooltip title="Refresh">
                  <Button icon={<ReloadOutlined />} aria-label="Refresh institutions" onClick={load} />
                </Tooltip>
              </>
            }
          />
        }
      >
        {error ? (
          <LoadErrorState
            title="Could not load institutions"
            text="Institution data could not be loaded. Try again or check the system connection."
            detail={error}
            onRetry={load}
          />
        ) : (
          <>
            <div className={a.desktopOnly}>
              <Table
                dataSource={institutions}
                columns={columns}
                rowKey="id"
                loading={loading}
                size="middle"
                scroll={{ x: 760 }}
                locale={{ emptyText: loading ? ' ' : emptyState }}
                pagination={(meta?.total ?? 0) > PAGE_SIZE ? {
                  current: page,
                  total: meta?.total ?? 0,
                  pageSize: PAGE_SIZE,
                  showSizeChanger: false,
                  onChange: (p) => setPage(p),
                  showTotal: (total, range) => `Showing ${range[0]}–${range[1]} of ${total}`,
                } : false}
              />
            </div>

            {/* Phones: one card per institution instead of a wide table (§21.11). */}
            <div className={a.mobileList}>
              {loading && !institutions.length ? (
                <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
              ) : !institutions.length ? emptyState : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {institutions.map((inst) => (
                    <li key={inst.id} className={a.mobileItem}>
                      <div className={a.mobileItemHead}>
                        <div className={a.cell}>
                          {logo(inst)}
                          <div style={{ minWidth: 0 }}>
                            <span className={a.cellTitle}>{inst.name}</span>
                            <span className={a.cellSub}>{inst.domain ?? inst.slug}</span>
                          </div>
                        </div>
                        <StatusChip status={inst.status} />
                      </div>
                      <div className={a.mobileMeta}>
                        {planChip(inst.subscriptionPlan)} · {inst.userCount ?? '—'} users · {inst.deptCount ?? '—'} departments
                      </div>
                      <div className={a.mobileActions}>
                        <Button size="small" icon={<SettingOutlined />} onClick={() => router.push(`/institutions/${inst.id}`)}>Manage</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {(meta?.total ?? 0) > PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <span style={{ margin: '0 12px', fontSize: 13, color: '#6B7280', alignSelf: 'center' }}>Page {page} of {meta?.totalPages}</span>
                  <Button size="small" disabled={page >= (meta?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              )}
            </div>
          </>
        )}
      </AdminCard>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSuccess={(inst) => { setShowCreate(false); router.push(`/institutions/${inst.id}`); }}
        />
      )}
    </div>
  );
}

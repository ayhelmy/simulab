'use client';

import { useEffect, useState, useCallback, useImperativeHandle, useRef, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Switch,
  Spin, Popconfirm, InputNumber, Row, Col, Tooltip, Skeleton,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, FileTextOutlined,
  InfoCircleOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import {
  getPageContentAdmin, createPageContentItem, updatePageContentItem,
  deletePageContentItem, updatePlatformStats, getPlatformStats,
  type PageContentItem, type CreatePageContentData, type PlatformStats,
} from '@/lib/pageContent';
import { ICON_NAMES, resolveIcon } from '@/lib/iconMap';
import { Chip } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminHeader, AdminCard, Toolbar, ResultCount,
  StateBlock, LoadErrorState, StatTile,
} from '@/components/admin/adminUi';

const { TextArea } = Input;

type PageKey = 'home' | 'why_bedo' | 'about' | 'resources';
type TabKey = PageKey | 'stats';

const PAGE_OPTIONS: { value: PageKey; label: string }[] = [
  { value: 'home',       label: 'Home Page' },
  { value: 'why_bedo',   label: 'Why BEDO' },
  { value: 'about',      label: 'About Us' },
  { value: 'resources',  label: 'Resources' },
];

// ── Stats panel ─────────────────────────────────────────────────────────────

function StatsPanel() {
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [uptime,  setUptime]  = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const fetchStats = useCallback(() => {
    getPlatformStats()
      .then((s) => { setStats(s); setUptime(s.uptime); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const load = () => { setLoading(true); fetchStats(); };

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function handleSaveUptime() {
    setSaving(true);
    try {
      await updatePlatformStats(uptime);
      setStats((prev) => prev ? { ...prev, uptime } : prev);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminCard><Skeleton active paragraph={{ rows: 3 }} /></AdminCard>;

  if (!stats) {
    return (
      <AdminCard>
        <LoadErrorState
          title="Could not load platform stats"
          text="The public platform statistics could not be loaded. Try again or check the system connection."
          onRetry={load}
        />
      </AdminCard>
    );
  }

  return (
    <>
      <AdminCard title="Live platform statistics" icon={<BarChartOutlined />} helper="Counted from the database and shown on the public website. Read-only.">
        <div className={a.tiles}>
          <StatTile label="Simulations" value={stats.simulationsCount ?? 0} tone="info" />
          <StatTile label="Institutions" value={stats.institutionsCount ?? 0} tone="info" />
          <StatTile label="Disciplines" value={stats.disciplinesCount ?? 0} tone="info" />
        </div>
      </AdminCard>

      <AdminCard title="Uptime" helper="Shown on the public website next to the live statistics.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Input
            value={uptime}
            onChange={(e) => setUptime(e.target.value)}
            style={{ width: 180 }}
            placeholder="e.g. 99.9%"
            aria-label="Uptime"
          />
          <Button type="primary" loading={saving} onClick={handleSaveUptime}>
            Save Uptime
          </Button>
        </div>
      </AdminCard>
    </>
  );
}

// ── Content table ────────────────────────────────────────────────────────────

export interface ContentTableHandle {
  openAdd: () => void;
}

function ContentTable({ page, ref }: { page: PageKey; ref?: Ref<ContentTableHandle> }) {
  const [items,   setItems]   = useState<PageContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<PageContentItem | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    getPageContentAdmin(page)
      .then(setItems)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ page, isActive: true, sortOrder: 0 });
    setModalOpen(true);
  }

  useImperativeHandle(ref, () => ({ openAdd }));

  function openEdit(item: PageContentItem) {
    setEditing(item);
    form.setFieldsValue({
      page:          item.page,
      section:       item.section,
      sortOrder:     item.sortOrder,
      title:         item.title,
      description:   item.description,
      iconName:      item.iconName,
      iconColor:     item.iconColor,
      category:      item.category,
      categoryColor: item.categoryColor,
      ctaText:       item.ctaText,
      isActive:      item.isActive,
      extraJson:     Object.keys(item.extra ?? {}).length ? JSON.stringify(item.extra, null, 2) : '',
    });
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    await deletePageContentItem(id);
    load();
  }

  async function handleSubmit() {
    const values = await form.validateFields();

    let extra: Record<string, unknown> | undefined;
    if (values.extraJson?.trim()) {
      try {
        extra = JSON.parse(values.extraJson);
      } catch {
        form.setFields([{ name: 'extraJson', errors: ['Must be valid JSON.'] }]);
        return;
      }
    }

    setSaving(true);
    try {
      const data: CreatePageContentData = {
        page:          values.page,
        section:       values.section,
        sortOrder:     values.sortOrder,
        title:         values.title || undefined,
        description:   values.description || undefined,
        iconName:      values.iconName || undefined,
        iconColor:     values.iconColor || undefined,
        category:      values.category || undefined,
        categoryColor: values.categoryColor || undefined,
        ctaText:       values.ctaText || undefined,
        extra,
      };
      if (editing) {
        await updatePageContentItem(editing.id, { ...data, isActive: values.isActive });
      } else {
        await createPageContentItem(data);
      }
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnsType<PageContentItem> = [
    {
      title: 'Section',
      dataIndex: 'section',
      width: 130,
      render: (v: string) => <Chip tone="neutral">{v}</Chip>,
    },
    {
      title: 'Order',
      dataIndex: 'sortOrder',
      width: 72,
      align: 'right',
      render: (v: number) => <span className={a.numeric}>{v}</span>,
    },
    {
      title: 'Icon',
      dataIndex: 'iconName',
      width: 64,
      align: 'center',
      render: (_: unknown, row: PageContentItem) => row.iconName
        ? resolveIcon(row.iconName, row.iconColor, 20)
        : <span className={a.muted}>—</span>,
    },
    {
      title: 'Title',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string | null) => v ? <span className={a.cellTitle} style={{ fontSize: 13 }}>{v}</span> : <span className={a.muted}>—</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (v: string | null) => v
        ? <span className={a.cellSub} title={v}>{v.slice(0, 80)}{v.length > 80 ? '…' : ''}</span>
        : <span className={a.muted}>—</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 120,
      render: (v: string | null) => v ? <Chip tone="info">{v}</Chip> : <span className={a.muted}>—</span>,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      width: 96,
      render: (v: boolean) => v ? <Chip tone="success">Active</Chip> : <Chip tone="neutral">Hidden</Chip>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 96,
      align: 'right',
      fixed: 'right',
      render: (_: unknown, row: PageContentItem) => (
        <span className={a.rowActions}>
          <Tooltip title="Edit item">
            <Button size="small" icon={<EditOutlined />} aria-label={`Edit ${row.title ?? row.section}`} onClick={() => openEdit(row)} />
          </Tooltip>
          <Popconfirm
            title="Delete this item?"
            description="It is removed from the public website. This cannot be undone."
            onConfirm={() => handleDelete(row.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete item">
              <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${row.title ?? row.section}`} />
            </Tooltip>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const pageLabel = PAGE_OPTIONS.find((p) => p.value === page)?.label ?? page;

  return (
    <>
      <AdminCard
        flush
        toolbar={
          <Toolbar
            filters={<span className={a.cellSub} style={{ fontSize: 13 }}>Items for <strong style={{ color: '#111827' }}>{pageLabel}</strong>, grouped by section and order</span>}
            end={
              <>
                {!loadFailed && !loading && <ResultCount total={items.length} noun="item" />}
                <Tooltip title="Refresh">
                  <Button icon={<ReloadOutlined />} aria-label="Refresh items" onClick={load} />
                </Tooltip>
              </>
            }
          />
        }
      >
        {loadFailed ? (
          <LoadErrorState
            title="Could not load content items"
            text={`Content for ${pageLabel} could not be loaded. Try again or check the system connection.`}
            onRetry={load}
          />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            loading={loading}
            size="middle"
            scroll={{ x: 860 }}
            pagination={items.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
            locale={{
              emptyText: loading ? ' ' : (
                <StateBlock
                  icon={<FileTextOutlined />}
                  title="No content items yet"
                  text="Add content items to manage public website sections."
                  actions={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Item</Button>}
                />
              ),
            }}
          />
        )}
      </AdminCard>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Item' : 'Add Item'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Save' : 'Create'}
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="page" label="Page" rules={[{ required: true }]}>
                <Select options={PAGE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="section" label="Section" rules={[{ required: true }]} extra="The block on the page this item belongs to.">
                <Input placeholder="e.g. features, values, cards" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item name="sortOrder" label="Sort Order" extra="Lower numbers appear first.">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="iconName" label="Icon">
                <Select
                  showSearch
                  allowClear
                  placeholder="Select icon"
                  options={ICON_NAMES.map((n) => ({ value: n, label: n }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item name="iconColor" label="Icon Color">
                <Input placeholder="#F59324" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="title" label="Title">
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="category" label="Category">
                <Input placeholder="e.g. Guide, Video, FAQ" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="categoryColor" label="Category Color">
                <Input placeholder="#F59324" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ctaText" label="CTA Text">
            <Input placeholder="e.g. Read Guide, Watch Video" />
          </Form.Item>

          <Form.Item
            name="extraJson"
            label="Extra (JSON)"
            tooltip="Structured fields for this section — e.g. button URLs, image URLs. Leave blank for none."
          >
            <TextArea rows={5} style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="{}" />
          </Form.Item>

          {editing && (
            <Form.Item name="isActive" label="Active" valuePropName="checked" extra="Hidden items stay saved but are not shown on the website.">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PageContentAdminPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const tableRef = useRef<ContentTableHandle>(null);

  useEffect(() => {
    if (!loading && user && !hasRole('super_admin')) {
      router.replace('/dashboard');
    }
  }, [user, loading, hasRole, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user || !hasRole('super_admin')) return null;

  const tabItems = [
    ...PAGE_OPTIONS.map(({ value, label }) => ({
      key: value,
      label,
      children: (
        <>
          <div className={a.note}>
            <InfoCircleOutlined />
            <span>
              Selected page: <strong>{label}</strong>. Content items control the public website sections and cards.
              Hidden items stay saved but are not shown.
            </span>
          </div>
          <ContentTable page={value} ref={activeTab === value ? tableRef : undefined} />
        </>
      ),
    })),
    {
      key: 'stats',
      label: 'Platform Stats',
      children: <StatsPanel />,
    },
  ];

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        title="Page Content"
        subtitle="Manage editable content for Home, Why BEDO, About Us, Resources, and platform stats."
        actions={activeTab !== 'stats' ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => tableRef.current?.openAdd()}>
            Add Item
          </Button>
        ) : undefined}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={tabItems}
        destroyOnHidden
      />
    </div>
  );
}

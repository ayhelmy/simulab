'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tabs, Table, Button, Modal, Form, Input, Select, Switch, Space,
  Typography, Spin, Tag, Popconfirm, InputNumber, Row, Col, Card, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import {
  getPageContentAdmin, createPageContentItem, updatePageContentItem,
  deletePageContentItem, updatePlatformStats, getPlatformStats,
  type PageContentItem, type CreatePageContentData, type PlatformStats,
} from '@/lib/pageContent';
import { ICON_NAMES, resolveIcon } from '@/lib/iconMap';

const { Title, Text } = Typography;
const { TextArea } = Input;

type PageKey = 'why_bedo' | 'about' | 'resources';

const PAGE_OPTIONS: { value: PageKey; label: string }[] = [
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

  useEffect(() => {
    getPlatformStats()
      .then((s) => { setStats(s); setUptime(s.uptime); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveUptime() {
    setSaving(true);
    try {
      await updatePlatformStats(uptime);
      setStats((prev) => prev ? { ...prev, uptime } : prev);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spin />;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
      <Col xs={24}>
        <Title level={5} style={{ marginBottom: 12 }}>Live Platform Statistics (read-only, from DB)</Title>
      </Col>
      {[
        { label: 'Simulations', value: stats?.simulationsCount ?? 0 },
        { label: 'Institutions', value: stats?.institutionsCount ?? 0 },
        { label: 'Disciplines', value: stats?.disciplinesCount ?? 0 },
      ].map((s) => (
        <Col xs={8} key={s.label}>
          <Card size="small" style={{ textAlign: 'center', background: '#FEF3E2', border: '1px solid #F59324' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F59324' }}>{s.value}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{s.label}</Text>
          </Card>
        </Col>
      ))}
      <Col xs={24}>
        <Divider style={{ margin: '8px 0' }} />
        <Title level={5} style={{ marginBottom: 8 }}>Uptime (editable)</Title>
        <Space>
          <Input
            value={uptime}
            onChange={(e) => setUptime(e.target.value)}
            style={{ width: 180 }}
            placeholder="e.g. 99.9%"
          />
          <Button type="primary" loading={saving} onClick={handleSaveUptime}>
            Save Uptime
          </Button>
        </Space>
      </Col>
    </Row>
  );
}

// ── Content table ────────────────────────────────────────────────────────────

function ContentTable({ page }: { page: PageKey }) {
  const [items,   setItems]   = useState<PageContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<PageContentItem | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getPageContentAdmin(page)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ page, isActive: true, sortOrder: 0 });
    setModalOpen(true);
  }

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
    });
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    await deletePageContentItem(id);
    load();
  }

  async function handleSubmit() {
    const values = await form.validateFields();
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
      width: 110,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '#',
      dataIndex: 'sortOrder',
      width: 48,
      align: 'center',
    },
    {
      title: 'Icon',
      dataIndex: 'iconName',
      width: 56,
      align: 'center',
      render: (_: unknown, row: PageContentItem) => resolveIcon(row.iconName, row.iconColor, 20),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string | null) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (v: string | null) => v
        ? <span style={{ fontSize: 12, color: '#6B7280' }}>{v.slice(0, 80)}{v.length > 80 ? '…' : ''}</span>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 90,
      render: (v: string | null, row: PageContentItem) => v
        ? <Tag color={row.categoryColor ?? undefined}>{v}</Tag>
        : null,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      width: 70,
      align: 'center',
      render: (v: boolean) => <Switch checked={v} disabled size="small" />,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, row: PageContentItem) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Delete this item?"
            onConfirm={() => handleDelete(row.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Add Item
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Item' : 'Add Item'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Save' : 'Create'}
        confirmLoading={saving}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="page" label="Page" rules={[{ required: true }]}>
                <Select options={PAGE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="section" label="Section" rules={[{ required: true }]}>
                <Input placeholder="e.g. features, values, cards" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="sortOrder" label="Sort Order">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="iconName" label="Icon">
                <Select
                  showSearch
                  allowClear
                  placeholder="Select icon"
                  options={ICON_NAMES.map((n) => ({ value: n, label: n }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
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
            <Col span={12}>
              <Form.Item name="category" label="Category">
                <Input placeholder="e.g. Guide, Video, FAQ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="categoryColor" label="Category Color">
                <Input placeholder="#F59324" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ctaText" label="CTA Text">
            <Input placeholder="e.g. Read Guide, Watch Video" />
          </Form.Item>

          {editing && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
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
      children: <ContentTable page={value} />,
    })),
    {
      key: 'stats',
      label: 'Platform Stats',
      children: <StatsPanel />,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Page Content</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Manage editable content for the Why BEDO, About Us, and Resources public pages.
        </Text>
      </div>

      <Tabs
        defaultActiveKey="why_bedo"
        items={tabItems}
        destroyInactiveTabPane
      />
    </div>
  );
}

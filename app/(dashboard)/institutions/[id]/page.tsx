'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Card, Tabs, Button, Form, Input, Select, InputNumber, Switch, Tag, Avatar,
  Typography, Table, Modal, Spin, Alert, Row, Col, Descriptions, Space,
  Badge, Checkbox, Popconfirm, App, Drawer, TreeSelect,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined, ArrowLeftOutlined, BookOutlined, SettingOutlined } from '@ant-design/icons';
import {
  getInstitution, updateInstitution,
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listTerms, createTerm, updateTerm, deleteTerm,
  listDomains, createDomain, deleteDomain,
  listEmailDomains, addEmailDomain, removeEmailDomain,
  getInstitutionSettings, updateInstitutionSettings,
  type InstitutionDetail, type DomainWithGlobal,
  type EmailDomain, type InstitutionSettings,
} from '@/lib/institutions';
import {
  listDepartmentCatalogs, assignCatalogToDepartment, revokeCatalogFromDepartment,
  type DepartmentCatalogAssignment,
} from '@/lib/departments';
import { getAssignedCatalogTree, toTreeSelectData } from '@/lib/simulations';
import type { Department, AcademicTerm } from '@/types';
import type { SimulationCatalog } from '@/types';
import StatusTag from '@/components/common/StatusTag';

// -- DeptCatalogsDrawer ------------------------------------------------------─

function DeptCatalogsDrawer({
  instId, dept, open, onClose, canEdit,
}: {
  instId: string;
  dept: Department | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
}) {
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<DepartmentCatalogAssignment[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [instTree,    setInstTree]    = useState<SimulationCatalog[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined);
  const [subtree,     setSubtree]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  const loadAssignments = useCallback(async () => {
    if (!dept) return;
    setLoading(true);
    try { setAssignments(await listDepartmentCatalogs(instId, dept.id)); }
    catch { setAssignments([]); }
    finally { setLoading(false); }
  }, [instId, dept]);

  useEffect(() => { if (open) loadAssignments(); }, [open, loadAssignments]);

  const openAssign = async () => {
    const tree = await getAssignedCatalogTree();
    setInstTree(tree);
    setSelectedCat(undefined);
    setSubtree(true);
    setAssignModal(true);
  };

  const handleAssign = async () => {
    if (!dept || !selectedCat) return;
    setSaving(true);
    try {
      await assignCatalogToDepartment(instId, dept.id, { catalogId: selectedCat, includeSubtree: subtree });
      setAssignModal(false);
      loadAssignments();
      message.success('Catalog assigned.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to assign catalog.');
    } finally { setSaving(false); }
  };

  const handleRevoke = async (catalogId: string) => {
    if (!dept) return;
    try {
      await revokeCatalogFromDepartment(instId, dept.id, catalogId);
      loadAssignments();
      message.success('Catalog removed.');
    } catch {
      message.error('Failed to remove catalog.');
    }
  };

  const cols: TableColumnsType<DepartmentCatalogAssignment> = [
    {
      title: 'Catalog',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r) => (
        <span>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {r.includeSubtree && <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>+subtree</Tag>}
        </span>
      ),
    },
    { title: 'Assigned', dataIndex: 'assignedAt', key: 'at', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    ...(canEdit ? [{
      title: '',
      key: 'remove',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, r: DepartmentCatalogAssignment) => (
        <Popconfirm title="Remove this catalog from the department?" onConfirm={() => handleRevoke(r.id)} okButtonProps={{ danger: true }}>
          <Button size="small" danger>Remove</Button>
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <>
      <Drawer
        title={dept ? `Simulation Catalogs — ${dept.name}` : 'Simulation Catalogs'}
        open={open}
        onClose={onClose}
        size={560}
        extra={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAssign}>
            Assign Catalog
          </Button>
        )}
      >
        <Table
          dataSource={assignments}
          columns={cols}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: 'No catalogs assigned to this department yet.' }}
        />
      </Drawer>

      <Modal
        open={assignModal}
        title={`Assign Catalog → ${dept?.name ?? 'Department'}`}
        onCancel={() => setAssignModal(false)}
        onOk={handleAssign}
        okText="Assign"
        okButtonProps={{ disabled: !selectedCat }}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="Catalog" required extra="Only catalogs already assigned to this institution are shown.">
            <TreeSelect
              treeData={toTreeSelectData(instTree) as never}
              value={selectedCat}
              onChange={setSelectedCat}
              placeholder="Select a catalog…"
              showSearch
              treeNodeFilterProp="title"
              style={{ width: '100%' }}
              allowClear
            />
          </Form.Item>
          <Form.Item label="Include sub-catalogs" style={{ marginBottom: 0 }}>
            <Switch checked={subtree} onChange={setSubtree} />
            <span style={{ marginLeft: 8, fontSize: 13, color: '#6B7280' }}>
              {subtree ? 'Department gets access to this catalog and all its children' : 'Only this exact catalog node'}
            </span>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

const { Text }     = Typography;
const { TextArea } = Input;

const TIMEZONE_OPTIONS = [
  'UTC','America/New_York','America/Chicago','America/Los_Angeles',
  'Europe/London','Europe/Paris','Asia/Dubai','Asia/Riyadh','Africa/Cairo','Asia/Kolkata','Asia/Singapore',
].map(tz => ({ value: tz, label: tz }));

const LOCALE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
];

// -- Departments Tab ----------------------------------------------------------─

function DepartmentsTab({ instId, canEdit }: { instId: string; canEdit: boolean }) {
  const { message } = App.useApp();
  const [form]    = Form.useForm();
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; dept?: Department }>({ open: false });
  const [saving,  setSaving]  = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [catDrawer, setCatDrawer] = useState<{ open: boolean; dept: Department | null }>({ open: false, dept: null });

  const load = useCallback(async () => {
    setLoading(true);
    try { setDepts(await listDepartments(instId)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [instId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    form.resetFields();
    setFormError(null);
    setModal({ open: true });
  };

  const openEdit = (d: Department) => {
    form.setFieldsValue({ name: d.name, code: d.code ?? '', parentId: d.parentId ?? undefined });
    setFormError(null);
    setModal({ open: true, dept: d });
  };

  const handleSave = async (values: { name: string; code?: string; parentId?: string }) => {
    setSaving(true); setFormError(null);
    try {
      const payload = { name: values.name, code: values.code || undefined, parentId: values.parentId || undefined };
      if (modal.dept) await updateDepartment(instId, modal.dept.id, payload);
      else await createDepartment(instId, payload);
      setModal({ open: false });
      load();
    } catch (err: unknown) {
      const e = err as { title?: string };
      setFormError(e.title ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (d: Department) => {
    try { await deleteDepartment(instId, d.id); load(); message.success('Department deleted.'); }
    catch { message.error('Failed to delete department.'); }
  };

  const columns: TableColumnsType<Department> = [
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (v: string, d: Department) => (
        <Link href={`/institutions/${instId}/departments/${d.id}`} style={{ fontWeight: 600 }}>{v}</Link>
      ),
    },
    { title: 'Code',   dataIndex: 'code', key: 'code', width: 100, render: (v?: string) => v ? <Tag>{v}</Tag> : '—' },
    {
      title: 'Parent', key: 'parent', width: 160,
      render: (_: unknown, d: Department) => depts.find(p => p.id === d.parentId)?.name ?? '—',
    },
    {
      title: '',
      key: 'manage',
      width: 110,
      render: (_: unknown, d: Department) => (
        <Link href={`/institutions/${instId}/departments/${d.id}`}>
          <Button size="small" icon={<SettingOutlined />}>Manage</Button>
        </Link>
      ),
    },
    {
      title: '',
      key: 'catalogs',
      width: 100,
      render: (_: unknown, d: Department) => (
        <Button
          size="small"
          icon={<BookOutlined />}
          onClick={() => setCatDrawer({ open: true, dept: d })}
        >
          Catalogs
        </Button>
      ),
    },
    ...(canEdit ? [{
      title: '',
      key: 'actions',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, d: Department) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(d)}>Edit</Button>
          <Popconfirm title={`Delete "${d.name}"?`} onConfirm={() => handleDelete(d)} okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15 }}>Departments</Text>
        {canEdit && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>Add Department</Button>}
      </div>
      <Table dataSource={depts} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }} />

      <Modal
        open={modal.open}
        title={modal.dept ? 'Edit Department' : 'New Department'}
        onCancel={() => setModal({ open: false })}
        onOk={() => form.submit()}
        okText={modal.dept ? 'Save' : 'Create'}
        confirmLoading={saving}
        destroyOnHidden
      >
        {formError && <Alert type="error" title={formError} showIcon style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSave}>
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Required.' }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Code (optional)" name="code" extra="Unique short code">
                <Input placeholder="e.g. CS" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Parent Department" name="parentId">
                <Select
                  allowClear
                  placeholder="None (top-level)"
                  options={depts
                    .filter(d => d.id !== modal.dept?.id)
                    .map(d => ({ value: d.id, label: d.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <DeptCatalogsDrawer
        instId={instId}
        dept={catDrawer.dept}
        open={catDrawer.open}
        onClose={() => setCatDrawer({ open: false, dept: null })}
        canEdit={canEdit}
      />
    </div>
  );
}

// -- Academic Terms Tab --------------------------------------------------------

function TermsTab({ instId, canEdit }: { instId: string; canEdit: boolean }) {
  const { message } = App.useApp();
  const [form]    = Form.useForm();
  const [terms,   setTerms]   = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ open: boolean; term?: AcademicTerm }>({ open: false });
  const [saving,  setSaving]  = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTerms(await listTerms(instId)); }
    finally { setLoading(false); }
  }, [instId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    form.resetFields();
    setFormError(null);
    setModal({ open: true });
  };

  const openEdit = (t: AcademicTerm) => {
    form.setFieldsValue({ name: t.name, startDate: t.startDate.split('T')[0], endDate: t.endDate.split('T')[0], isCurrent: t.isCurrent });
    setFormError(null);
    setModal({ open: true, term: t });
  };

  const handleSave = async (values: { name: string; startDate: string; endDate: string; isCurrent: boolean }) => {
    setSaving(true); setFormError(null);
    try {
      if (modal.term) await updateTerm(instId, modal.term.id, values);
      else await createTerm(instId, values);
      setModal({ open: false });
      load();
    } catch (err: unknown) {
      const e = err as { title?: string };
      setFormError(e.title ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (t: AcademicTerm) => {
    try { await deleteTerm(instId, t.id); load(); message.success('Term deleted.'); }
    catch { message.error('Failed to delete term.'); }
  };

  const columns: TableColumnsType<AcademicTerm> = [
    { title: 'Name',    dataIndex: 'name',      key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Start',   dataIndex: 'startDate',  key: 'start', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: 'End',     dataIndex: 'endDate',    key: 'end',   width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: 'Current', dataIndex: 'isCurrent',  key: 'curr',  width: 100, render: (v: boolean) => v ? <Tag color="green">Current</Tag> : '—' },
    ...(canEdit ? [{
      title: '',
      key: 'actions',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, t: AcademicTerm) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(t)}>Edit</Button>
          <Popconfirm title={`Delete "${t.name}"?`} onConfirm={() => handleDelete(t)} okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15 }}>Academic Terms</Text>
        {canEdit && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>Add Term</Button>}
      </div>
      <Table dataSource={terms} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 10 }}
 />

      <Modal
        open={modal.open}
        title={modal.term ? 'Edit Term' : 'New Academic Term'}
        onCancel={() => setModal({ open: false })}
        onOk={() => form.submit()}
        okText={modal.term ? 'Save' : 'Create'}
        confirmLoading={saving}
        destroyOnHidden
      >
        {formError && <Alert type="error" title={formError} showIcon style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSave}>
          <Form.Item label="Term Name" name="name" rules={[{ required: true, message: 'Required.' }]}>
            <Input placeholder="e.g. Fall 2026" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Start Date" name="startDate" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="endDate" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isCurrent" valuePropName="checked">
            <Checkbox>Mark as current active term</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// -- Domains Tab --------------------------------------------------------------─

function DomainsTab({ instId, canEdit }: { instId: string; canEdit: boolean }) {
  const { message } = App.useApp();
  const [domains,      setDomains]      = useState<DomainWithGlobal[]>([]);
  const [emailDomains, setEmailDomains] = useState<EmailDomain[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [addModal,     setAddModal]     = useState(false);
  const [emailModal,   setEmailModal]   = useState(false);
  const [form]         = Form.useForm();
  const [emailForm]    = Form.useForm();
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, e] = await Promise.all([listDomains(instId), listEmailDomains(instId)]);
      setDomains(d); setEmailDomains(e);
    } finally { setLoading(false); }
  }, [instId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateDomain = async (values: { name: string; description?: string; color: string }) => {
    setSaving(true); setFormError(null);
    try {
      await createDomain(instId, values);
      setAddModal(false);
      load();
    } catch (err: unknown) {
      const e = err as { title?: string };
      setFormError(e.title ?? 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleAddEmail = async (values: { domain: string; isPrimary: boolean }) => {
    setSaving(true); setFormError(null);
    try {
      await addEmailDomain(instId, values);
      setEmailModal(false);
      load();
    } catch (err: unknown) {
      const e = err as { title?: string };
      setFormError(e.title ?? 'Invalid domain');
    } finally { setSaving(false); }
  };

  const customDomains = domains.filter(d => !d.isGlobal);
  const globalDomains = domains.filter(d => d.isGlobal);

  const emailColumns: TableColumnsType<EmailDomain> = [
    { title: 'Domain',  dataIndex: 'domain',    key: 'domain', render: (v: string) => <Text code>{v}</Text> },
    { title: 'Primary', dataIndex: 'isPrimary', key: 'primary', width: 100, render: (v: boolean) => v ? <Tag color="blue">Primary</Tag> : '—' },
    ...(canEdit ? [{
      title: '',
      key: 'actions',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, d: EmailDomain) => (
        <Popconfirm title={`Remove @${d.domain}?`} onConfirm={async () => { await removeEmailDomain(instId, d.id); load(); message.success('Removed.'); }} okButtonProps={{ danger: true }}>
          <Button size="small" danger>Remove</Button>
        </Popconfirm>
      ),
    }] : []),
  ];

  if (loading) return <Spin />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Subject Domains */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Text strong style={{ fontSize: 15, display: 'block' }}>Subject Domains</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Custom subject domains for this institution</Text>
          </div>
          {canEdit && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ color: '#6366F1' }); setFormError(null); setAddModal(true); }}>Add Domain</Button>}
        </div>

        <Row gutter={[10, 10]}>
          {customDomains.map(d => (
            <Col key={d.id} xs={24} sm={12} md={8} lg={6}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <Text strong style={{ flex: 1, fontSize: 13 }}>{d.name}</Text>
                  {canEdit && (
                    <Popconfirm title={`Delete "${d.name}"?`} onConfirm={async () => { await deleteDomain(instId, d.id); load(); }} okButtonProps={{ danger: true }}>
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  )}
                </div>
                {d.description && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>{d.description}</Text>}
              </Card>
            </Col>
          ))}
          {customDomains.length === 0 && (
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 13 }}>No custom domains yet.</Text>
            </Col>
          )}
        </Row>

        {globalDomains.length > 0 && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12, color: '#6B7280', cursor: 'pointer', fontWeight: 600 }}>
              Global platform domains ({globalDomains.length})
            </summary>
            <Space wrap style={{ marginTop: 8 }}>
              {globalDomains.map(d => (
                <Tag key={d.id} color="default" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  {d.name}
                </Tag>
              ))}
            </Space>
          </details>
        )}
      </div>

      {/* Email Registration Domains */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Text strong style={{ fontSize: 15, display: 'block' }}>Email Registration Domains</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Users with these email domains can self-register</Text>
          </div>
          {canEdit && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { emailForm.resetFields(); setFormError(null); setEmailModal(true); }}>Add Domain</Button>}
        </div>
        <Table dataSource={emailDomains} columns={emailColumns} rowKey="id" size="small" pagination={{ pageSize: 10 }}
 />
      </div>

      {/* Add Subject Domain modal */}
      <Modal open={addModal} title="Add Subject Domain" onCancel={() => setAddModal(false)} onOk={() => form.submit()} okText="Add" confirmLoading={saving} destroyOnHidden>
        {formError && <Alert type="error" title={formError} showIcon style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleCreateDomain} initialValues={{ color: '#6366F1' }}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input placeholder="e.g. Nursing" /></Form.Item>
          <Form.Item label="Description (optional)" name="description"><Input /></Form.Item>
          <Form.Item label="Color" name="color"><Input type="color" style={{ width: 60, padding: 2 }} /></Form.Item>
        </Form>
      </Modal>

      {/* Add Email Domain modal */}
      <Modal open={emailModal} title="Add Email Domain" onCancel={() => setEmailModal(false)} onOk={() => emailForm.submit()} okText="Add" confirmLoading={saving} destroyOnHidden>
        {formError && <Alert type="error" title={formError} showIcon style={{ marginBottom: 12 }} />}
        <Form form={emailForm} layout="vertical" requiredMark={false} onFinish={handleAddEmail} initialValues={{ isPrimary: false }}>
          <Form.Item label="Email Domain" name="domain" rules={[{ required: true }]}><Input placeholder="university.edu" /></Form.Item>
          <Form.Item name="isPrimary" valuePropName="checked"><Checkbox>Mark as primary domain</Checkbox></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// -- Settings Tab --------------------------------------------------------------

function SettingsTab({ instId }: { instId: string }) {
  const { message } = App.useApp();
  const [form]     = Form.useForm<Partial<InstitutionSettings>>();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    getInstitutionSettings()
      .then(s => { form.setFieldsValue(s); })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, [instId, form]);

  const handleSave = async (values: Partial<InstitutionSettings>) => {
    setSaving(true);
    try {
      const updated = await updateInstitutionSettings(values);
      form.setFieldsValue(updated);
      message.success('Settings saved.');
    } catch (err: unknown) {
      const e = err as { title?: string };
      message.error(e.title ?? 'Failed to save settings');
    } finally { setSaving(false); }
  };

  if (loading) return <Spin />;

  return (
    <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSave}>
      <Card title="Branding" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col span={12}><Form.Item label="Institution Name" name="name"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item label="Logo URL" name="logoUrl"><Input placeholder="https://…" /></Form.Item></Col>
          <Col span={12}>
            <Form.Item label="Brand Color" name="primaryColor">
              <Input type="color" style={{ width: 60, padding: 2 }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select options={TIMEZONE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Language" name="locale">
              <Select options={LOCALE_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Enrollment Policy" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Default Enrollment Type" name="enrollmentType">
              <Select options={[
                { value: 'open',     label: 'Open — anyone can enroll' },
                { value: 'approval', label: 'Approval required' },
                { value: 'code',     label: 'Enrollment code' },
                { value: 'admin',    label: 'Admin-only' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Default Max Enrollment (0 = unlimited)" name="enrollmentCap">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Require approval for enrollment requests" name="requireApproval" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>

      <Card title="Notification Defaults" size="small" style={{ marginBottom: 16 }}>
        <Form.Item label="Email notifications" name="notificationEmailEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Push notifications" name="notificationPushEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>

      <Card title="Simulation Defaults" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Max attempts per simulation" name="maxSimAttempts">
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

      <Card title="Authentication" size="small" style={{ marginBottom: 16 }}>
        <Form.Item label="Session duration (days)" name="sessionDurationDays" style={{ maxWidth: 200 }}>
          <InputNumber min={1} max={365} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Require email verification for new accounts" name="requireEmailVerification" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" htmlType="submit" loading={saving}>Save Settings</Button>
      </div>
    </Form>
  );
}

// -- Overview Tab --------------------------------------------------------------

function OverviewTab({ inst, canEdit, onUpdated }: { inst: InstitutionDetail; canEdit: boolean; onUpdated: () => void }) {
  const { message } = App.useApp();
  const [form]    = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const handleSave = async (values: { name: string; domain?: string; logoUrl?: string; primaryColor: string; timezone: string; locale: string }) => {
    setSaving(true);
    try {
      await updateInstitution(inst.id, {
        name:         values.name,
        domain:       values.domain       || undefined,
        logoUrl:      values.logoUrl      || undefined,
        primaryColor: values.primaryColor,
        timezone:     values.timezone,
        locale:       values.locale,
      });
      message.success('Institution updated.');
      setEditing(false);
      onUpdated();
    } catch (err: unknown) {
      const e = err as { title?: string };
      message.error(e.title ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <Row gutter={16}>
      <Col xs={24} md={16}>
        <Card
          title="Details"
          extra={canEdit && !editing && <Button icon={<EditOutlined />} size="small" onClick={() => { form.setFieldsValue({ name: inst.name, domain: inst.domain ?? '', logoUrl: inst.logoUrl ?? '', primaryColor: inst.primaryColor, timezone: inst.timezone, locale: inst.locale }); setEditing(true); }}>Edit</Button>}
        >
          {editing ? (
            <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSave}>
              <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Row gutter={12}>
                <Col span={12}><Form.Item label="Primary Domain" name="domain"><Input placeholder="university.edu" /></Form.Item></Col>
                <Col span={12}><Form.Item label="Logo URL" name="logoUrl"><Input placeholder="https://…" /></Form.Item></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><Form.Item label="Timezone" name="timezone"><Select options={TIMEZONE_OPTIONS} /></Form.Item></Col>
                <Col span={12}><Form.Item label="Language" name="locale"><Select options={LOCALE_OPTIONS} /></Form.Item></Col>
              </Row>
              <Form.Item label="Brand Color" name="primaryColor">
                <Input type="color" style={{ width: 60, padding: 2 }} />
              </Form.Item>
              <Space>
                <Button onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={saving}>Save</Button>
              </Space>
            </Form>
          ) : (
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Slug"><Text code>{inst.slug}</Text></Descriptions.Item>
              <Descriptions.Item label="Status"><StatusTag status={inst.status} /></Descriptions.Item>
              <Descriptions.Item label="Plan" span={1}>{inst.subscriptionPlan}</Descriptions.Item>
              <Descriptions.Item label="Max Users">{inst.maxUsers.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Timezone">{inst.timezone}</Descriptions.Item>
              <Descriptions.Item label="Language">{inst.locale}</Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(inst.createdAt).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>
          )}
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card title="Brand Preview">
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <div style={{ height: 56, background: inst.primaryColor, display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
              {inst.logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={inst.logoUrl} alt="logo" style={{ height: 32, objectFit: 'contain' }} />
                : <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{inst.name}</span>
              }
            </div>
            <div style={{ padding: '0.875rem', background: '#F9FAFB' }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Primary: {inst.primaryColor}
              </Text>
              <Space>
                <span style={{ background: inst.primaryColor, color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Button</span>
                <span style={{ background: inst.primaryColor + '20', color: inst.primaryColor, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Badge</span>
              </Space>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
}

// -- Main Page ----------------------------------------------------------------─

export default function InstitutionDetailPage({ params }: { params: Promise<{ id: string; tab?: string }> }) {
  const { id } = use(params);
  const router   = useRouter();
  const { user } = useAuth();

  const [inst,       setInst]       = useState<InstitutionDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState('overview');

  // Read ?tab= from URL on mount
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q) setActiveTab(q);
  }, []);

  const canEdit    = !!(user?.permissions.includes('institutions.manage_own') || user?.permissions.includes('institutions.manage_all'));
  const canViewAll = !!(user?.permissions.includes('institutions.view_all'));

  const loadInst = useCallback(async () => {
    setLoading(true); setError(null);
    try { setInst(await getInstitution(id)); }
    catch (err: unknown) { const e = err as { title?: string }; setError(e.title ?? 'Not found'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadInst(); }, [loadInst]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error || !inst) return (
    <div>
      <Alert type="error" title={error ?? 'Institution not found'} showIcon style={{ marginBottom: 16 }} />
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Back</Button>
    </div>
  );

  const tabItems = [
    { key: 'overview',    label: 'Overview',       children: <OverviewTab inst={inst} canEdit={canEdit} onUpdated={loadInst} /> },
    { key: 'departments', label: 'Departments',    children: <DepartmentsTab instId={id} canEdit={canEdit} /> },
    { key: 'terms',       label: 'Academic Terms', children: <TermsTab instId={id} canEdit={canEdit} /> },
    { key: 'domains',     label: 'Domains',        children: <DomainsTab instId={id} canEdit={canEdit} /> },
    { key: 'settings',    label: 'Settings',       children: <SettingsTab instId={id} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {canViewAll && (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push('/institutions')} />
        )}
        <Avatar
          size={40}
          src={inst.logoUrl}
          style={{ background: inst.primaryColor, fontWeight: 700, flexShrink: 0 }}
        >
          {!inst.logoUrl && inst.name[0].toUpperCase()}
        </Avatar>
        <div>
          <Text strong style={{ fontSize: 18, display: 'block' }}>{inst.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{inst.slug} · <StatusTag status={inst.status} /></Text>
        </div>
      </div>

      <Tabs
        items={tabItems}
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyOnHidden
      />
    </div>
  );
}

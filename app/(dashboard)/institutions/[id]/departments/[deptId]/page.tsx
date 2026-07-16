'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { listAcademicYears, createAcademicYear, deleteAcademicYear } from '@/lib/academic-years';
import { listSemesterTerms, createSemesterTerm, deleteSemesterTerm } from '@/lib/semester-terms';
import { getDepartment, listDepartmentCatalogs, assignCatalogToDepartment, revokeCatalogFromDepartment } from '@/lib/departments';
import { getAssignedCatalogTree, toTreeSelectData } from '@/lib/simulations';
import type { AcademicYear, SemesterTerm } from '@/types';
import type { Department, DepartmentCatalogAssignment } from '@/lib/departments';
import {
  Tabs, Card, Button, Table, Tag, Typography, Breadcrumb, Spin, Empty, App,
  Modal, Form, Input, InputNumber, Select, Popconfirm, TreeSelect, Badge,
  Descriptions,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, BookOutlined, CalendarOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface Props { params: Promise<{ id: string; deptId: string }> }

// -- Academic Year + Term tree ------------------------------------------------─

function SemesterTermsPanel({
  year, instId, canManage,
}: { year: AcademicYear; instId: string; canManage: boolean }) {
  const { message } = App.useApp();
  const [terms,    setTerms]    = useState<SemesterTerm[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [addOpen,  setAddOpen]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form]                  = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setTerms(await listSemesterTerms(year.id)); }
    catch { setTerms([]); }
    finally { setLoading(false); }
  }, [year.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values: { name: string; code?: string; termOrder?: number }) => {
    setSaving(true);
    try {
      await createSemesterTerm(year.id, values);
      message.success('Semester term added.');
      form.resetFields();
      setAddOpen(false);
      load();
    } catch (e: unknown) {
      const err = e as { detail?: string };
      message.error(err.detail ?? 'Failed to add term.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSemesterTerm(id);
      setTerms(ts => ts.filter(t => t.id !== id));
      message.success('Semester term deleted.');
    } catch (e: unknown) {
      const err = e as { detail?: string };
      message.error(err.detail ?? 'Failed to delete term.');
    }
  };

  return (
    <div style={{ paddingLeft: 16 }}>
      {loading ? <Spin size="small" /> : (
        <>
          {terms.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
              padding: '6px 10px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB',
            }}>
              <UnorderedListOutlined style={{ color: '#6B7280' }} />
              <Text style={{ flex: 1 }}>{t.name}</Text>
              {t.code && <Tag>{t.code}</Tag>}
              <Tag color={t.status === 'active' ? 'green' : t.status === 'archived' ? 'default' : 'orange'}>{t.status}</Tag>
              {canManage && (
                <Popconfirm
                  title="Delete this semester term?"
                  description="Courses under this term will be affected."
                  onConfirm={() => handleDelete(t.id)}
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>
          ))}
          {!terms.length && <Text type="secondary" style={{ fontSize: 12 }}>No semester terms yet.</Text>}

          {canManage && (
            <Button type="dashed" size="small" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => setAddOpen(true)}>
              Add Semester
            </Button>
          )}
        </>
      )}

      <Modal open={addOpen} title="Add Semester Term" onCancel={() => { setAddOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="Add" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleAdd} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Semester 1" />
          </Form.Item>
          <Form.Item name="code" label="Code">
            <Input placeholder="e.g. S1" />
          </Form.Item>
          <Form.Item name="termOrder" label="Order">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// -- Academic Years tab --------------------------------------------------------

function AcademicYearsTab({
  deptId, instId, canManage,
}: { deptId: string; instId: string; canManage: boolean }) {
  const { message } = App.useApp();
  const [years,   setYears]   = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form]                = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setYears(await listAcademicYears(deptId)); }
    catch { setYears([]); }
    finally { setLoading(false); }
  }, [deptId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (values: { name: string; code?: string; yearOrder?: number }) => {
    setSaving(true);
    try {
      await createAcademicYear(deptId, values);
      message.success('Academic year added.');
      form.resetFields();
      setAddOpen(false);
      load();
    } catch (e: unknown) {
      const err = e as { detail?: string };
      message.error(err.detail ?? 'Failed to add academic year.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAcademicYear(id);
      setYears(ys => ys.filter(y => y.id !== id));
      message.success('Academic year deleted.');
    } catch (e: unknown) {
      const err = e as { detail?: string };
      message.error(err.detail ?? 'Failed to delete.');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary">Academic years and their semester terms for this department.</Text>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Add Academic Year</Button>
        )}
      </div>

      {!years.length && <Empty description="No academic years yet." />}

      {years.map(y => (
        <Card key={y.id} size="small" style={{ marginBottom: 12 }}
          styles={{ body: { padding: '10px 14px' } }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: '#1677FF' }} />
              <Text strong>{y.name}</Text>
              {y.code && <Tag>{y.code}</Tag>}
              <Tag color={y.status === 'active' ? 'green' : y.status === 'archived' ? 'default' : 'orange'}>{y.status}</Tag>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>Order: {y.yearOrder}</Text>
              {canManage && (
                <Popconfirm
                  title="Delete this academic year?"
                  description="All semester terms under it will be removed."
                  onConfirm={() => handleDelete(y.id)}
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>
          }
        >
          <SemesterTermsPanel year={y} instId={instId} canManage={canManage} />
        </Card>
      ))}

      <Modal open={addOpen} title="Add Academic Year" onCancel={() => { setAddOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} okText="Add" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleAdd} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Academic Year 1" />
          </Form.Item>
          <Form.Item name="code" label="Code">
            <Input placeholder="e.g. AY1" />
          </Form.Item>
          <Form.Item name="yearOrder" label="Order">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// -- Simulation Catalogs tab --------------------------------------------------─

function CatalogsTab({ deptId, instId, canManage }: { deptId: string; instId: string; canManage: boolean }) {
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<DepartmentCatalogAssignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [addOpen,     setAddOpen]     = useState(false);
  const [treeData,    setTreeData]    = useState<unknown[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [subtree,     setSubtree]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAssignments(await listDepartmentCatalogs(instId, deptId)); }
    catch { setAssignments([]); }
    finally { setLoading(false); }
  }, [instId, deptId]);

  useEffect(() => { load(); }, [load]);

  const openAssign = async () => {
    try {
      const tree = await getAssignedCatalogTree();
      setTreeData(toTreeSelectData(tree));
    } catch { setTreeData([]); }
    setAddOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedCat) { message.error('Select a catalog.'); return; }
    setSaving(true);
    try {
      await assignCatalogToDepartment(instId, deptId, { catalogId: selectedCat, includeSubtree: subtree });
      message.success('Catalog assigned.');
      setAddOpen(false);
      setSelectedCat(null);
      load();
    } catch (e: unknown) {
      const err = e as { detail?: string };
      message.error(err.detail ?? 'Failed to assign catalog.');
    } finally { setSaving(false); }
  };

  const handleRevoke = async (catalogId: string) => {
    try {
      await revokeCatalogFromDepartment(instId, deptId, catalogId);
      setAssignments(as => as.filter(a => a.id !== catalogId));
      message.success('Catalog removed.');
    } catch (e: unknown) {
      const err = e as { detail?: string };
      message.error(err.detail ?? 'Failed to remove catalog.');
    }
  };

  const columns = [
    { title: 'Catalog', dataIndex: 'name', key: 'name', render: (n: string, r: DepartmentCatalogAssignment) => (
      <span>{n} {r.includeSubtree && <Tag color="blue" style={{ fontSize: 11 }}>+subtree</Tag>}</span>
    )},
    { title: 'Assigned', dataIndex: 'assignedAt', key: 'assignedAt', render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
    canManage ? {
      title: '', key: 'actions', width: 80, render: (_: unknown, r: DepartmentCatalogAssignment) => (
        <Popconfirm title="Remove this catalog assignment?" onConfirm={() => handleRevoke(r.id)} okButtonProps={{ danger: true }}>
          <Button size="small" danger type="text" icon={<DeleteOutlined />}>Remove</Button>
        </Popconfirm>
      ),
    } : null,
  ].filter(Boolean);

  return (
    <div>
      {canManage && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<BookOutlined />} onClick={openAssign}>Assign Catalog</Button>
        </div>
      )}
      {loading ? <Spin /> : (
        !assignments.length
          ? <Empty description="No simulation catalogs assigned to this department." />
          : <Table rowKey="id" columns={columns as never} dataSource={assignments} pagination={false} size="small" />
      )}

      <Modal open={addOpen} title="Assign Simulation Catalog" onCancel={() => { setAddOpen(false); setSelectedCat(null); }}
        onOk={handleAssign} okText="Assign" confirmLoading={saving} destroyOnHidden>
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="Simulation Catalog" required>
            <TreeSelect
              treeData={treeData as never}
              value={selectedCat}
              onChange={setSelectedCat}
              placeholder="Select a catalog from institution assignments"
              style={{ width: '100%' }}
              showSearch
              treeNodeFilterProp="title"
            />
          </Form.Item>
          <Form.Item label="Include Subtree" extra="Include all child catalogs automatically.">
            <Select value={subtree ? 'yes' : 'no'} onChange={v => setSubtree(v === 'yes')}
              options={[{ value: 'yes', label: 'Yes — include sub-catalogs' }, { value: 'no', label: 'No — this catalog only' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------─

export default function DepartmentDetailPage({ params }: Props) {
  const { id: instId, deptId } = use(params);
  const { hasRole } = useAuth();

  const [dept, setDept] = useState<Department | null>(null);

  useEffect(() => {
    getDepartment(instId, deptId).then(setDept).catch(() => setDept(null));
  }, [instId, deptId]);

  const canManage = hasRole('super_admin') || hasRole('institution_admin');

  const tabItems = [
    {
      key: 'academic',
      label: <span><CalendarOutlined /> Academic Years</span>,
      children: <AcademicYearsTab deptId={deptId} instId={instId} canManage={canManage} />,
    },
    {
      key: 'catalogs',
      label: <span><BookOutlined /> Simulation Catalogs</span>,
      children: <CatalogsTab deptId={deptId} instId={instId} canManage={canManage} />,
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <Link href="/institutions">Institutions</Link> },
          { title: <Link href={`/institutions/${instId}`}>Institution</Link> },
          { title: <Link href={`/institutions/${instId}?tab=departments`}>Departments</Link> },
          { title: dept?.name ?? 'Department' },
        ]}
      />

      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          {dept ? `${dept.name}${dept.code ? ` (${dept.code})` : ''}` : 'Department'}
        </Title>
        <Text type="secondary">
          Manage academic years, semester terms, and simulation catalog assignments.
        </Text>
      </div>

      <Tabs items={tabItems} />
    </div>
  );
}

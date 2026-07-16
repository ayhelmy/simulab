'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import {
  Tree, Tag, Button, Spin, Alert, Typography, Modal, Form, Input,
  Select, Popconfirm, App, Tabs, Table, Avatar, TreeSelect,
  Space, Drawer, Row, Col, type TableColumnsType, TreeDataNode,
} from 'antd';
import {
  AppstoreAddOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  ExperimentOutlined, BankOutlined, FolderAddOutlined, ScissorOutlined,
  ArrowRightOutlined, CarryOutOutlined, UploadOutlined, CheckCircleOutlined,
  InboxOutlined,
  CaretDownOutlined,
  CaretLeftOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import {
  getCatalogTree, getAssignedCatalogTree, getCatalog, createCatalog, updateCatalog,
  moveCatalog, deleteCatalog, removeSimulationFromCatalog, createSimulationInCatalog,
  listCatalogInstitutions, assignCatalogToInstitution, revokeCatalogFromInstitution,
  uploadWebGLSimulation,
  toTreeSelectData,
  type CreateCatalogData, type UpdateCatalogData, type SimulationCatalogDetail,
  type CatalogItem, type AssignedInstitution, type CreateSimulationInCatalogData,
  type WebGLUploadData,
} from '@/lib/simulations';
import { listInstitutions } from '@/lib/institutions';
import type { SimulationCatalog, Simulation } from '@/types';

const { Text, Title } = Typography;

const DIFF_COLOR: Record<string, string> = {
  beginner: 'green', intermediate: 'blue', advanced: 'red',
};
const VIS_COLOR: Record<string, string> = {
  global: 'blue', institution: 'purple', demo_public: 'orange',
};

// -- Tree data conversion ------------------------------------------------------

// interface CatalogNode {
//   key: string;
//   title: string;
//   isLeaf: boolean;
//   children?: CatalogNode[];
//   icon?: React.ReactNode;
// }

function toCatalogNodes(nodes: SimulationCatalog[]): TreeDataNode[] {
  return nodes.map((n) => ({
    key: n.id,
    title: n.name,
    isLeaf: !n.children?.length,
    children: n.children?.length ? toCatalogNodes(n.children) : undefined,
    icon: <CarryOutOutlined />,
  }));
}

// -- Create Catalog Modal ------------------------------------------------------

function CreateCatalogModal({
  tree,
  parentId,
  onClose,
  onSuccess,
}: {
  tree: SimulationCatalog[];
  parentId?: string | null;
  onClose: () => void;
  onSuccess: (c: SimulationCatalog) => void;
}) {
  const [form] = Form.useForm<CreateCatalogData>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubCatalog = parentId !== undefined;

  async function handleFinish(values: CreateCatalogData) {
    setSaving(true); setError(null);
    try {
      const catalog = await createCatalog({ ...values, parentId: parentId ?? undefined });
      onSuccess(catalog);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to create catalog');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={<><FolderAddOutlined /> {isSubCatalog ? 'New Sub-Catalog' : 'New Root Catalog'}</>}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Create"
      confirmLoading={saving}
      destroyOnHidden
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ visibility: isSubCatalog ? undefined : 'global', sortOrder: 0 }}
        onFinish={handleFinish}
      >
        {!isSubCatalog && (
          <Form.Item label="Parent (optional)" name="parentId">
            <TreeSelect
              allowClear
              placeholder="None — create as root"
              treeData={toTreeSelectData(tree) as any}
              showSearch
              treeNodeFilterProp="title"
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}
        <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="e.g. Mechanical Engineering" autoFocus />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Visibility" name="visibility">
          <Select options={[
            { value: 'global', label: 'Global — all institutions' },
            { value: 'institution', label: 'Institution — assigned only' },
            { value: 'demo_public', label: 'Demo Public — public preview' },
          ]} />
        </Form.Item>
        <Form.Item label="Sort Order" name="sortOrder">
          <Input type="number" min={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Edit Catalog Modal --------------------------------------------------------

function EditCatalogModal({
  catalog,
  onClose,
  onSuccess,
}: {
  catalog: SimulationCatalog;
  onClose: () => void;
  onSuccess: (c: SimulationCatalog) => void;
}) {
  const [form] = Form.useForm<UpdateCatalogData>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish(values: UpdateCatalogData) {
    setSaving(true); setError(null);
    try {
      const updated = await updateCatalog(catalog.id, values);
      onSuccess(updated);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title="Edit Catalog"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={saving}
      destroyOnHidden
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ name: catalog.name, description: catalog.description, status: catalog.status, visibility: catalog.visibility }}
        onFinish={handleFinish}
      >
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select options={[
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ]} />
        </Form.Item>
        <Form.Item label="Visibility" name="visibility">
          <Select options={[
            { value: 'global', label: 'Global' },
            { value: 'institution', label: 'Institution' },
            { value: 'demo_public', label: 'Demo Public' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Move Catalog Modal --------------------------------------------------------

function MoveCatalogModal({
  catalog,
  tree,
  onClose,
  onSuccess,
}: {
  catalog: SimulationCatalog;
  tree: SimulationCatalog[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newParentId, setNewParentId] = useState<string | null>(catalog.parentId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOk() {
    setSaving(true); setError(null);
    try {
      await moveCatalog(catalog.id, { newParentId });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to move catalog');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={<><ScissorOutlined /> Move "{catalog.name}"</>}
      onCancel={onClose}
      onOk={handleOk}
      okText="Move"
      confirmLoading={saving}
      destroyOnHidden
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Select the new parent catalog. Leave empty to make it a root catalog.
      </Text>
      <TreeSelect
        allowClear
        placeholder="None — move to root"
        value={newParentId ?? undefined}
        treeData={toTreeSelectData(tree, catalog.id) as any}
        showSearch
        treeNodeFilterProp="title"
        style={{ width: '100%' }}
        onChange={(v) => setNewParentId(v ?? null)}
      />
    </Modal>
  );
}

// -- Create Simulation Drawer (catalog-context creation) ----------------------─

function CreateSimulationDrawer({
  catalogId,
  catalogName,
  ancestors,
  onClose,
  onSuccess,
}: {
  catalogId: string;
  catalogName: string;
  ancestors: SimulationCatalog[];
  onClose: () => void;
  onSuccess: (sim: Simulation) => void;
}) {
  const [form] = Form.useForm<CreateSimulationInCatalogData>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breadcrumb = [...ancestors.map((a) => a.name), catalogName].join(' › ');

  async function handleFinish(values: CreateSimulationInCatalogData) {
    setSaving(true); setError(null);
    try {
      const result = await createSimulationInCatalog(catalogId, values);
      onSuccess(result.simulation);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to create simulation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      title={<><ExperimentOutlined /> Create Simulation</>}
      size={600}
      onClose={onClose}
      extra={
        <Button type="primary" loading={saving} onClick={() => form.submit()}>
          Create
        </Button>
      }
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        description={
          <><Text strong>Creating inside: </Text><Text type="secondary">{breadcrumb}</Text></>
        }
      />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 12 }} />}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ type: 'scorm', difficulty: 'intermediate', visibility: 'institution', maxScore: 100, passScore: 70, maxAttempts: 3 }}
        onFinish={handleFinish}
      >
        <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="e.g. Fire Safety Fundamentals" autoFocus />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} placeholder="Brief overview…" />
        </Form.Item>
        <Form.Item label="Launch URL" name="launchUrl" rules={[{ required: true, message: 'Required.' }]}>
          <Input placeholder="https://sims.example.com/fire-safety" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Type" name="type">
              <Select options={[
                { value: 'scorm', label: 'SCORM' },
                { value: 'lti', label: 'LTI' },
                { value: 'internal', label: 'Internal' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Difficulty" name="difficulty">
              <Select options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Visibility" name="visibility">
              <Select options={[
                { value: 'private', label: 'Private' },
                { value: 'institution', label: 'Institution' },
                { value: 'demo_public', label: 'Demo Public' },
              ]} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Max Score" name="maxScore">
              <Input type="number" min={1} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Pass Score" name="passScore">
              <Input type="number" min={0} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Max Attempts" name="maxAttempts">
              <Input type="number" min={1} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Est. Minutes" name="estimatedMinutes">
              <Input type="number" min={1} placeholder="Optional" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Version" name="version">
              <Input placeholder="1.0.0" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Thumbnail URL" name="thumbnailUrl">
          <Input placeholder="https://…/thumbnail.png (optional)" />
        </Form.Item>
        <Form.Item
          label="Learning Objectives"
          name="learningObjectives"
          tooltip="Type an objective and press Enter to add it. You can add multiple."
        >
          <Select
            mode="tags"
            placeholder="e.g. Identify lab safety procedures, Operate centrifuge correctly…"
            tokenSeparators={[',']}
            style={{ width: '100%' }}
            notFoundContent={null}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

// -- WebGL Upload Drawer ------------------------------------------------------─

function UploadWebGLDrawer({
  catalogId,
  catalogName,
  ancestors,
  onClose,
  onSuccess,
}: {
  catalogId: string;
  catalogName: string;
  ancestors: SimulationCatalog[];
  onClose: () => void;
  onSuccess: (sim: Simulation) => void;
}) {
  const [form] = Form.useForm<WebGLUploadData>();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { message: msg } = App.useApp();

  const breadcrumb = [...ancestors.map((a) => a.name), catalogName].join(' › ');

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.zip')) {
      msg.error('Only .zip files are accepted.');
      e.target.value = '';
      return;
    }
    setFile(f);
    setError(null);
    setProgress(null);
    setDone(false);
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      if (!file) { msg.error('Please select a ZIP file.'); return; }
      setUploading(true);
      setError(null);
      setProgress(0);
      console.log('Uploading WebGL simulation:', file.name, values, catalogId);
      const result = await uploadWebGLSimulation(catalogId, values, file, (p) => setProgress(p));
      setDone(true);
      msg.success(`"${result.simulation.title}" uploaded and ready!`);
      onSuccess(result.simulation);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      if (e?.detail || e?.title) {
        setError(e.detail ?? e.title ?? 'Upload failed.');
      }
      // Ant Design Form validation errors are handled internally
    } finally {
      setUploading(false);
    }
  }

  return (
    <Drawer
      open
      title={<><UploadOutlined /> Upload WebGL Simulation</>}
      size={620}
      onClose={onClose}
      extra={
        <Button
          type="primary"
          loading={uploading}
          disabled={done}
          onClick={handleSubmit}
          icon={<UploadOutlined />}
        >
          {uploading ? `Uploading ${progress ?? 0}%…` : 'Upload & Create'}
        </Button>
      }
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        description={
          <><Text strong>Adding to: </Text><Text type="secondary">{breadcrumb}</Text></>
        }
      />

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      {done && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="Upload complete! Simulation is ready."
          style={{ marginBottom: 12 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ difficulty: 'intermediate', visibility: 'institution' }}
      >
        {/* ZIP file picker */}
        <Form.Item label="Unity WebGL ZIP File" required>
          <div
            style={{
              border: '2px dashed #D1D5DB',
              borderRadius: 8,
              padding: 24,
              textAlign: 'center',
              background: file ? '#F0FDF4' : '#FAFAFA',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onClick={() => document.getElementById('webgl-zip-input')?.click()}
          >
            <input
              id="webgl-zip-input"
              type="file"
              accept=".zip"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {file ? (
              <Space orientation="vertical" size={2}>
                <CheckCircleOutlined style={{ fontSize: 24, color: '#16A34A' }} />
                <Text strong style={{ color: '#16A34A' }}>{file.name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              </Space>
            ) : (
              <Space orientation="vertical" size={2}>
                <InboxOutlined style={{ fontSize: 32, color: '#9CA3AF' }} />
                <Text type="secondary">Click to select a Unity WebGL ZIP file</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>Max 500 MB</Text>
              </Space>
            )}
          </div>
          {progress !== null && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: 'linear-gradient(90deg,#7C3AED,#2563EB)',
                  transition: 'width 0.2s',
                  borderRadius: 2,
                }} />
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{progress}% uploaded</Text>
            </div>
          )}
        </Form.Item>

        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: 'Title is required.' }]}
        >
          <Input placeholder="e.g. Fire Safety Simulation" autoFocus />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} placeholder="Brief overview…" />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="Difficulty" name="difficulty">
              <Select options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Estimated Duration (min)" name="estimatedMinutes">
              <Input type="number" min={1} placeholder="e.g. 15" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Visibility" name="visibility">
          <Select options={[
            { value: 'private', label: 'Private — admin only' },
            { value: 'institution', label: 'Institution — assigned institutions' },
            { value: 'demo_public', label: 'Demo Public — anyone' },
            { value: 'demo_and_institution', label: 'Demo and Institution' },
            { value: 'global', label: 'Global — all institutions' }
          ]} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

// -- Assign Institution Modal --------------------------------------------------

function AssignInstitutionModal({
  catalogId,
  assignedIds,
  onClose,
  onSuccess,
}: {
  catalogId: string;
  assignedIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [insts, setInsts] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | undefined>();
  const [subtree, setSubtree] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    listInstitutions({ limit: 200 })
      .then(({ institutions }) => {
        setInsts(institutions.filter((i) => !assignedIds.has(i.id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignedIds]);

  async function handleAssign() {
    if (!selected) return;
    setSaving(true);
    try {
      await assignCatalogToInstitution(selected, catalogId, subtree);
      message.success('Catalog assigned');
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to assign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={<><BankOutlined /> Assign to Institution</>}
      onCancel={onClose}
      onOk={handleAssign}
      okText="Assign"
      confirmLoading={saving}
      okButtonProps={{ disabled: !selected }}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Institution">
          <Select
            showSearch
            loading={loading}
            placeholder="Select institution"
            style={{ width: '100%' }}
            options={insts.map((i) => ({ value: i.id, label: i.name }))}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onChange={(v) => setSelected(v)}
          />
        </Form.Item>
        <Form.Item label="Include sub-catalogs">
          <Select
            value={subtree}
            options={[
              { value: true, label: 'Yes — include entire subtree' },
              { value: false, label: 'No — this catalog only' },
            ]}
            onChange={setSubtree}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Catalog Detail Panel ------------------------------------------------------

function CatalogDetailPanel({
  catalog,
  institutions,
  canManage,
  onEditSuccess,
  onReloadDetail,
}: {
  catalog: SimulationCatalogDetail;
  institutions: AssignedInstitution[];
  canManage: boolean;
  onEditSuccess: (c: SimulationCatalog) => void;
  onReloadDetail: () => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [showEdit, setShowEdit] = useState(false);
  // const [showCreateSim,   setShowCreateSim]   = useState(false);
  const [showWebGLUpload, setShowWebGLUpload] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleRemoveSim(simId: string) {
    setRemovingId(simId);
    try {
      await removeSimulationFromCatalog(catalog.id, simId);
      message.success('Simulation removed');
      onReloadDetail();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRevokeInst(institutionId: string) {
    setRevokingId(institutionId);
    try {
      await revokeCatalogFromInstitution(institutionId, catalog.id);
      message.success('Revoked');
      onReloadDetail();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to revoke');
    } finally {
      setRevokingId(null);
    }
  }

  const assignedInstIds = new Set(institutions.map((i) => i.id));

  const itemCols: TableColumnsType<CatalogItem> = [
    {
      title: 'Simulation',
      render: (_, item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} shape="square" src={item.thumbnailUrl ?? undefined} icon={!item.thumbnailUrl && <ExperimentOutlined />} style={{ background: '#F59324' }} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              {item.estimatedMinutes ? `${item.estimatedMinutes}m · ` : ''}{item.type.toUpperCase()}
            </Text>
          </div>
        </div>
      ),
    },
    { title: 'Difficulty', dataIndex: 'difficulty', width: 110, render: (d: string) => <Tag color={DIFF_COLOR[d]}>{d}</Tag> },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag status={s} /> },
    ...(canManage ? [{
      title: '',
      key: 'remove',
      width: 50,
      render: (_: unknown, item: CatalogItem) => (
        <Popconfirm title="Remove from catalog?" onConfirm={() => handleRemoveSim(item.simulationId)} okText="Remove" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<DeleteOutlined />} loading={removingId === item.simulationId} />
        </Popconfirm>
      ),
    }] : []),
  ];

  const instCols: TableColumnsType<AssignedInstitution> = [
    {
      title: 'Institution',
      render: (_, inst) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={28} src={inst.logoUrl ?? undefined} style={{ background: '#F59324', flexShrink: 0 }}>
            {!inst.logoUrl && inst.name[0]}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>{inst.name}</Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{inst.domain ?? inst.slug}</Text>
            {!inst.isDirect && inst.assignedViaCatalog && (
              <Text type="secondary" style={{ fontSize: 10, display: 'block', fontStyle: 'italic' }}>
                via "{inst.assignedViaCatalog}"
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Assignment',
      width: 100,
      render: (_: unknown, inst: AssignedInstitution) => (
        inst.isDirect
          ? <Tag color="blue">Direct</Tag>
          : <Tag color="default">Inherited</Tag>
      ),
    },
    { title: 'Subtree', dataIndex: 'includeSubtree', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Status', dataIndex: 'status', width: 90, render: (s: string) => <StatusTag status={s} /> },
    {
      title: '',
      key: 'revoke',
      width: 70,
      render: (_: unknown, inst: AssignedInstitution) => inst.isDirect ? (
        <Popconfirm title="Revoke catalog?" onConfirm={() => handleRevokeInst(inst.id)} okText="Revoke" okButtonProps={{ danger: true }}>
          <Button size="small" danger loading={revokingId === inst.id}>Revoke</Button>
        </Popconfirm>
      ) : (
        <Text type="secondary" style={{ fontSize: 11 }}>inherited</Text>
      ),
    },
  ];

  const tabs = [
    {
      key: 'simulations',
      label: `Simulations (${catalog.items.length})`,
      children: (
        <div>
          {canManage && (
            <Space style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                size="small"
                icon={<UploadOutlined />}
                onClick={() => setShowWebGLUpload(true)}
              >
                Upload WebGL
              </Button>
              {/* <Button size="small" icon={<PlusOutlined />} onClick={() => setShowCreateSim(true)}>
                Add (SCORM/LTI)
              </Button> */}
            </Space>
          )}
          {catalog.items.length === 0 ? (
            <Alert type="info" showIcon title={canManage ? 'No simulations. Add some above.' : 'No simulations in this catalog.'} />
          ) : (
            <Table dataSource={catalog.items} columns={itemCols} rowKey="simulationId" size="small" pagination={{ pageSize: 15 }} />
          )}
        </div>
      ),
    },
    ...(canManage ? [{
      key: 'institutions',
      label: `Institutions (${institutions.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Button size="small" icon={<BankOutlined />} onClick={() => setShowAssign(true)}>
              Assign to Institution
            </Button>
          </div>
          {institutions.length === 0 ? (
            <Alert type="info" showIcon title="Not assigned to any institution yet." />
          ) : (
            <Table dataSource={institutions} columns={instCols} rowKey="id" size="small" pagination={{ pageSize: 15 }} />
          )}
        </div>
      ),
    }] : []),
  ];

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{catalog.name}</Title>
          {catalog.description && <Text type="secondary" style={{ fontSize: 13 }}>{catalog.description}</Text>}
        </div>
        <Space>
          {canManage && (
            <Button size="small" icon={<EditOutlined />} onClick={() => setShowEdit(true)}>Edit</Button>
          )}
          <Button size="small" icon={<ArrowRightOutlined />} onClick={() => router.push(`/simulation-catalogs/${catalog.id}`)}>
            Full page
          </Button>
        </Space>
      </div>

      {/* Meta badges */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tag color={VIS_COLOR[catalog.visibility] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {catalog.visibility.replace('_', ' ')}
        </Tag>
        <StatusTag status={catalog.status} />
        {catalog.depth !== undefined && (
          <Text type="secondary" style={{ fontSize: 12 }}>Depth {catalog.depth}</Text>
        )}
        {catalog.ancestors && catalog.ancestors.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {catalog.ancestors.map((a) => a.name).join(' › ')} ›
          </Text>
        )}
      </div>

      <Tabs items={tabs} size="small" />

      {showEdit && (
        <EditCatalogModal
          catalog={catalog}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => { setShowEdit(false); onEditSuccess(updated); }}
        />
      )}
      {/* {showCreateSim && (
        <CreateSimulationDrawer
          catalogId={catalog.id}
          catalogName={catalog.name}
          ancestors={catalog.ancestors ?? []}
          onClose={() => setShowCreateSim(false)}
          onSuccess={(sim) => {
            setShowCreateSim(false);
            message.success(`"${sim.title}" created and added to catalog`);
            onReloadDetail();
          }}
        />
      )} */}
      {showWebGLUpload && (
        <UploadWebGLDrawer
          catalogId={catalog.id}
          catalogName={catalog.name}
          ancestors={catalog.ancestors ?? []}
          onClose={() => setShowWebGLUpload(false)}
          onSuccess={(sim) => {
            setShowWebGLUpload(false);
            message.success(`"${sim.title}" uploaded and ready!`);
            onReloadDetail();
          }}
        />
      )}
      {showAssign && (
        <AssignInstitutionModal
          catalogId={catalog.id}
          assignedIds={assignedInstIds}
          onClose={() => setShowAssign(false)}
          onSuccess={() => { setShowAssign(false); onReloadDetail(); }}
        />
      )}
    </div>
  );
}

// -- Main Page ----------------------------------------------------------------─

export default function SimulationCatalogsPage() {
  const allowed = useRouteGuard(
    'simulation_catalogs.manage_global',
    'simulation_catalogs.view_assigned',
    'simulations.view_catalog',
  );
  const { hasPermission } = useAuth();
  const { message } = App.useApp();

  const canManage = hasPermission('simulation_catalogs.manage_global');

  // Tree state
  const [tree, setTree] = useState<SimulationCatalog[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Selected catalog detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SimulationCatalogDetail | null>(null);
  const [institutions, setInstitutions] = useState<AssignedInstitution[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modal visibility
  const [showCreate, setShowCreate] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);
  const [showMove, setShowMove] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load tree
  const loadTree = useCallback(async () => {
    setTreeLoading(true); setTreeError(null);
    try {
      const data = canManage ? await getCatalogTree() : await getAssignedCatalogTree();
      setTree(data);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setTreeError(e.title ?? e.detail ?? 'Failed to load catalog tree');
    } finally {
      setTreeLoading(false);
    }
  }, [canManage]);

  useEffect(() => { if (allowed) loadTree(); }, [allowed, loadTree]);

  // Load detail for selected node
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const [cat, insts] = await Promise.all([
        getCatalog(id),
        canManage ? listCatalogInstitutions(id) : Promise.resolve([]),
      ]);
      setDetail(cat);
      setInstitutions(insts);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [canManage]);

  function handleSelect(keys: React.Key[]) {
    if (!keys.length) return;
    const id = keys[0] as string;
    setSelectedId(id);
    loadDetail(id);
  }

  async function handleDelete() {
    if (!selectedId) return;
    setDeleting(true);
    try {
      await deleteCatalog(selectedId);
      message.success('Catalog deleted');
      setSelectedId(null);
      setDetail(null);
      loadTree();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to delete catalog');
    } finally {
      setDeleting(false);
    }
  }

  if (!allowed) return null;

  const selectedCatalog = detail;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Simulation Catalogs"
        subtitle={canManage ? 'Manage the global catalog hierarchy' : 'Browse assigned simulation catalogs'}
        extra={
          canManage ? (
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => { setCreateParentId(undefined); setShowCreate(true); }}
              >
                New Catalog
              </Button>
              {selectedId && detail && (
                <>
                  <Button
                    icon={<FolderAddOutlined />}
                    onClick={() => { setCreateParentId(selectedId); setShowCreate(true); }}
                  >
                    Add Sub-Catalog
                  </Button>
                  <Button icon={<ScissorOutlined />} onClick={() => setShowMove(true)}>Move</Button>
                  <Popconfirm
                    title={`Delete "${detail.name}"?`}
                    description="All simulations in this catalog will be unlinked. Sub-catalogs must be removed first."
                    onConfirm={handleDelete}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<DeleteOutlined />} loading={deleting}>Delete</Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          ) : undefined
        }
      />

      {treeError && <Alert type="error" title={treeError} showIcon style={{ marginBottom: 16 }} />}

      <div style={{ display: 'flex', flex: 1, gap: 0, minHeight: 0 }}>

        {/* Left panel: tree */}
        <div style={{
          width: 280,
          borderRight: '1px solid #dfdfdf',
          padding: '12px 8px',
          overflowY: 'auto',
          flexShrink: 0,
          // height: '100vh',
          backgroundColor: '#fefefe',
        }}>
          <span style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Catalogs</span>

          {treeLoading ? (
            <div style={{ textAlign: 'center', padding: 32, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}><Spin /></div>
          ) : tree.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <AppstoreAddOutlined style={{ fontSize: 32, color: '#ccc', marginBottom: 8 }} />
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {canManage ? 'No catalogs yet. Click "New Catalog" to get started.' : 'No catalogs assigned.'}
              </Text>
            </div>
          ) : (

            <Tree
              treeData={toCatalogNodes(tree)}
              onSelect={handleSelect}
              selectedKeys={selectedId ? [selectedId] : []}
              defaultExpandAll={false}
              // showLine
              // icon={<FolderOutlined />}
              style={{
                fontSize: 13,
                backgroundColor: '#fffcfc', borderRadius: 4, padding: 4, width: '100%', height: '100%',
                border: 'none', outline: 'none',
              }}
              switcherIcon={({ expanded }) => (
                <CaretLeftOutlined
                  style={{ transform: `rotate(${expanded ? 0 : -90}deg)`, transition: 'transform 0.3s', color: '#F59324' }}
                />
              )}
            />
          )}
        </div>

        {/* Right panel: detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>


          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
          ) : selectedCatalog ? (
            <CatalogDetailPanel
              catalog={selectedCatalog}
              institutions={institutions}
              canManage={canManage}
              onEditSuccess={(updated) => {
                setDetail((prev) => prev ? { ...prev, ...updated } : prev);
                loadTree();
              }}
              onReloadDetail={() => loadDetail(selectedCatalog.id)}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#999', paddingTop: 60 }}>
              <AppstoreAddOutlined style={{ fontSize: 48 }} />
              <Text type="secondary">Select a catalog from the tree to view details</Text>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateCatalogModal
          tree={tree}
          parentId={createParentId}
          onClose={() => setShowCreate(false)}
          onSuccess={(catalog) => {
            setShowCreate(false);
            loadTree();
            setSelectedId(catalog.id);
            loadDetail(catalog.id);
          }}
        />
      )}

      {showMove && selectedCatalog && (
        <MoveCatalogModal
          catalog={selectedCatalog}
          tree={tree}
          onClose={() => setShowMove(false)}
          onSuccess={() => {
            setShowMove(false);
            loadTree();
            loadDetail(selectedCatalog.id);
          }}
        />
      )}
    </div>
  );
}

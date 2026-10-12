'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import {
  Tree, Button, Alert, Typography, Modal, Form, Input,
  Select, Popconfirm, App, Tabs, Table, Avatar, TreeSelect, Skeleton,
  Space, Drawer, Row, Col, type TableColumnsType, TreeDataNode,
} from 'antd';
import {
  AppstoreAddOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  ExperimentOutlined, BankOutlined, FolderAddOutlined, ScissorOutlined,
  ArrowRightOutlined, CarryOutOutlined, UploadOutlined, CheckCircleOutlined,
  InboxOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';
import { Chip, type ChipTone } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminHeader, AdminCard, StatusChip, StatTile,
  StateBlock, LoadErrorState, statusLabel,
} from '@/components/admin/adminUi';
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

const { Text } = Typography;

// -- Tree data conversion ------------------------------------------------------

// interface CatalogNode {
//   key: string;
//   title: string;
//   isLeaf: boolean;
//   children?: CatalogNode[];
//   icon?: React.ReactNode;
// }

const DIFF_TONE: Record<string, ChipTone> = {
  beginner: 'success', intermediate: 'info', advanced: 'error',
};

/** Tree row: catalog name + simulation count (when the API sends it). */
function toCatalogNodes(nodes: SimulationCatalog[]): TreeDataNode[] {
  return nodes.map((n) => ({
    key: n.id,
    title: (
      <span className={a.treeNode} title={n.name}>
        <span className={a.treeNodeName}>{n.name}</span>
        {n.itemCount != null && (
          <span className={a.treeNodeCount} aria-label={`${n.itemCount} simulations`}>{n.itemCount}</span>
        )}
        {n.status && n.status !== 'active' && <StatusChip status={n.status} />}
      </span>
    ),
    isLeaf: !n.children?.length,
    children: n.children?.length ? toCatalogNodes(n.children) : undefined,
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

const VIS_LABEL: Record<string, string> = {
  global: 'Global', institution: 'Institution', demo_public: 'Demo Public', demo_and_institution: 'Demo + Institution',
};

function CatalogDetailPanel({
  catalog,
  institutions,
  canManage,
  onEditSuccess,
  onReloadDetail,
  onAddSubCatalog,
  onMove,
  onDelete,
  deleting,
}: {
  catalog: SimulationCatalogDetail;
  institutions: AssignedInstitution[];
  canManage: boolean;
  onEditSuccess: (c: SimulationCatalog) => void;
  onReloadDetail: () => void;
  onAddSubCatalog: () => void;
  onMove: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const [tab, setTab] = useState('simulations');
  const [showEdit, setShowEdit] = useState(false);
  // const [showCreateSim,   setShowCreateSim]   = useState(false);
  const [showWebGLUpload, setShowWebGLUpload] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

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

  // Same update the Edit modal sends, with only the status changed.
  async function handleArchive() {
    setArchiving(true);
    try {
      const updated = await updateCatalog(catalog.id, { status: 'archived' });
      message.success('Catalog archived');
      onEditSuccess(updated);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to archive catalog');
    } finally {
      setArchiving(false);
    }
  }

  const assignedInstIds = new Set(institutions.map((i) => i.id));
  const directCount = institutions.filter((i) => i.isDirect).length;

  const itemCols: TableColumnsType<CatalogItem> = [
    {
      title: 'Simulation',
      key: 'title',
      render: (_, item) => (
        <div className={a.cell}>
          <Avatar size={32} shape="square" src={item.thumbnailUrl ?? undefined} icon={!item.thumbnailUrl && <ExperimentOutlined />} style={{ background: '#D9E8F0', color: '#2F5A70', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <a className={a.cellTitle} style={{ fontSize: 13 }} href={`/simulations/${item.simulationId}`} onClick={(e) => { e.preventDefault(); router.push(`/simulations/${item.simulationId}`); }}>
              {item.title}
            </a>
            <span className={a.cellSub}>
              {item.type === 'webgl' ? 'WebGL' : item.type.toUpperCase()}{item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ''}
            </span>
          </div>
        </div>
      ),
    },
    { title: 'Difficulty', dataIndex: 'difficulty', width: 120, render: (d: string) => <Chip tone={DIFF_TONE[d] ?? 'neutral'}>{statusLabel(d)}</Chip> },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <StatusChip status={s} /> },
    ...(canManage ? [{
      title: 'Actions',
      key: 'remove',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, item: CatalogItem) => (
        <Popconfirm
          title={`Remove "${item.title}" from this catalog?`}
          description="Institutions assigned to this catalog lose access to it."
          onConfirm={() => handleRemoveSim(item.simulationId)}
          okText="Remove"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger loading={removingId === item.simulationId}>Remove</Button>
        </Popconfirm>
      ),
    }] : []),
  ];

  const instCols: TableColumnsType<AssignedInstitution> = [
    {
      title: 'Institution',
      key: 'name',
      render: (_, inst) => (
        <div className={a.cell}>
          <Avatar size={28} src={inst.logoUrl ?? undefined} style={{ background: '#F59324', flexShrink: 0 }}>
            {!inst.logoUrl && inst.name[0]}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <span className={a.cellTitle} style={{ fontSize: 13 }}>{inst.name}</span>
            <span className={a.cellSub}>
              {inst.domain ?? inst.slug}
              {!inst.isDirect && inst.assignedViaCatalog && <> · via “{inst.assignedViaCatalog}”</>}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Assignment',
      key: 'assignment',
      width: 120,
      render: (_: unknown, inst: AssignedInstitution) => (
        inst.isDirect ? <Chip tone="info">Direct</Chip> : <Chip tone="neutral">Inherited</Chip>
      ),
    },
    {
      title: 'Sub-catalogs', dataIndex: 'includeSubtree', width: 120,
      render: (v: boolean) => <Chip tone={v ? 'success' : 'neutral'}>{v ? 'Included' : 'Not included'}</Chip>,
    },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <StatusChip status={s} /> },
    {
      title: 'Actions',
      key: 'revoke',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, inst: AssignedInstitution) => inst.isDirect ? (
        <Popconfirm
          title={`Revoke this catalog from ${inst.name}?`}
          description="Its users lose access to the simulations in this catalog."
          onConfirm={() => handleRevokeInst(inst.id)}
          okText="Revoke"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger loading={revokingId === inst.id}>Revoke</Button>
        </Popconfirm>
      ) : (
        <span className={a.cellSub}>Inherited</span>
      ),
    },
  ];

  const tabs = [
    {
      key: 'simulations',
      label: `Simulations (${catalog.items.length})`,
      children: (
        <div className={a.table}>
          <Table
            dataSource={catalog.items}
            columns={itemCols}
            rowKey="simulationId"
            size="small"
            scroll={{ x: 560 }}
            pagination={catalog.items.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            locale={{
              emptyText: (
                <StateBlock
                  compact
                  icon={<ExperimentOutlined />}
                  title="No simulations in this catalog"
                  text={canManage
                    ? 'Upload a WebGL simulation to add it to this catalog and every institution assigned to it.'
                    : 'Simulations added to this catalog will appear here.'}
                  actions={canManage && <Button icon={<UploadOutlined />} onClick={() => setShowWebGLUpload(true)}>Add Simulation</Button>}
                />
              ),
            }}
          />
        </div>
      ),
    },
    ...(canManage ? [{
      key: 'institutions',
      label: `Assigned Institutions (${institutions.length})`,
      children: (
        <div className={a.table}>
          <Table
            dataSource={institutions}
            columns={instCols}
            rowKey="id"
            size="small"
            scroll={{ x: 620 }}
            pagination={institutions.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            locale={{
              emptyText: (
                <StateBlock
                  compact
                  icon={<BankOutlined />}
                  title="Not assigned to any institution"
                  text="Assign this catalog so an institution's instructors can add its simulations to their courses."
                  actions={<Button icon={<BankOutlined />} onClick={() => setShowAssign(true)}>Assign to Institution</Button>}
                />
              ),
            }}
          />
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      <section className={a.card} aria-labelledby="catalog-detail-title">
        {/* Summary */}
        <div className={a.cardBody} style={{ borderBottom: '1px solid #F3F4F6' }}>
          {catalog.ancestors && catalog.ancestors.length > 0 && (
            <span className={a.breadcrumbPath}>{catalog.ancestors.map((x) => x.name).join(' › ')} ›</span>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0, flex: '1 1 260px' }}>
              <h2 className={a.title} id="catalog-detail-title" style={{ fontSize: 18 }}>{catalog.name}</h2>
              <div className={a.detailMeta} style={{ marginTop: 6 }}>
                <StatusChip status={catalog.status} />
                <Chip tone="info">{VIS_LABEL[catalog.visibility] ?? statusLabel(catalog.visibility)}</Chip>
                <Chip tone="neutral">{catalog.depth === 0 ? 'Root catalog' : `Level ${catalog.depth + 1}`}</Chip>
              </div>
              {catalog.description && <p className={a.subtitle} style={{ marginTop: 8 }}>{catalog.description}</p>}
            </div>
            <Button type="link" size="small" icon={<ArrowRightOutlined />} onClick={() => router.push(`/simulation-catalogs/${catalog.id}`)}>
              Open full page
            </Button>
          </div>

          <div className={a.tiles} style={{ marginTop: 14 }}>
            <StatTile label="Simulations" value={catalog.items.length} tone="info" icon={<ExperimentOutlined />} />
            {canManage && <StatTile label="Assigned institutions" value={institutions.length} icon={<BankOutlined />} />}
            {canManage && <StatTile label="Direct assignments" value={directCount} />}
          </div>

          {canManage && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <Button icon={<EditOutlined />} onClick={() => setShowEdit(true)}>Edit Catalog</Button>
              <Button icon={<BankOutlined />} onClick={() => { setTab('institutions'); setShowAssign(true); }}>Assign to Institution</Button>
              <Button icon={<UploadOutlined />} onClick={() => { setTab('simulations'); setShowWebGLUpload(true); }}>Add Simulation</Button>
              <Button icon={<FolderAddOutlined />} onClick={onAddSubCatalog}>Add Sub-Catalog</Button>
              <Button icon={<ScissorOutlined />} onClick={onMove}>Move</Button>
              {catalog.status !== 'archived' && (
                <Popconfirm
                  title={`Archive "${catalog.name}"?`}
                  description="The catalog stays assigned but is marked archived. You can set it back to Active from Edit Catalog."
                  onConfirm={handleArchive}
                  okText="Archive"
                >
                  <Button icon={<InboxOutlined />} loading={archiving}>Archive</Button>
                </Popconfirm>
              )}
              <Popconfirm
                title={`Delete "${catalog.name}"?`}
                description="All simulations in this catalog will be unlinked. Sub-catalogs must be removed first. This cannot be undone."
                onConfirm={onDelete}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />} loading={deleting}>Delete</Button>
              </Popconfirm>
            </div>
          )}
        </div>

        <Tabs className={a.tabsFlush} activeKey={tab} onChange={setTab} items={tabs} size="small" />
      </section>

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
    </>
  );
}

// -- Main Page ----------------------------------------------------------------─

function countCatalogs(nodes: SimulationCatalog[]): number {
  return nodes.reduce((n, c) => n + 1 + countCatalogs(c.children ?? []), 0);
}

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
  const [detailError, setDetailError] = useState(false);

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
    setDetailError(false);
    try {
      const [cat, insts] = await Promise.all([
        getCatalog(id),
        canManage ? listCatalogInstitutions(id) : Promise.resolve([]),
      ]);
      setDetail(cat);
      setInstitutions(insts);
    } catch {
      setDetail(null);
      setDetailError(true);
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
  const totalCatalogs = countCatalogs(tree);
  const openCreateRoot = () => { setCreateParentId(undefined); setShowCreate(true); };

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        title="Simulation Catalogs"
        subtitle={canManage
          ? 'Manage the global simulation catalog hierarchy and assign catalogs to institutions.'
          : 'Browse the simulation catalogs assigned to your institution.'}
        actions={canManage ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoot}>New Catalog</Button>
        ) : undefined}
      />

      <div className={a.split}>
        {/* Left: catalog tree */}
        <AdminCard
          className={a.treePanel}
          title="Catalog tree"
          icon={<AppstoreAddOutlined />}
          helper={!treeLoading && !treeError && tree.length > 0 ? `${totalCatalogs} catalog${totalCatalogs === 1 ? '' : 's'} · simulation count per catalog` : undefined}
          flush
        >
          {treeLoading ? (
            <div style={{ padding: 16 }}><Skeleton active title={false} paragraph={{ rows: 6 }} /></div>
          ) : treeError ? (
            <LoadErrorState compact title="Could not load catalog tree" text="The catalog hierarchy could not be loaded. Try again or check the system connection." detail={treeError} onRetry={loadTree} />
          ) : tree.length === 0 ? (
            <StateBlock
              compact
              icon={<AppstoreAddOutlined />}
              title={canManage ? 'No catalogs yet' : 'No catalogs assigned'}
              text={canManage
                ? 'Create a catalog to group simulations and assign them to institutions.'
                : 'Catalogs assigned to your institution will appear here.'}
              actions={canManage && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoot}>New Catalog</Button>}
            />
          ) : (
            <div className={a.treeScroll}>
              <Tree
                blockNode
                treeData={toCatalogNodes(tree)}
                onSelect={handleSelect}
                selectedKeys={selectedId ? [selectedId] : []}
                defaultExpandAll={false}
                switcherIcon={({ expanded }) => (
                  <CaretDownOutlined
                    style={{ transform: `rotate(${expanded ? 0 : -90}deg)`, transition: 'transform 0.2s', color: '#6B7280' }}
                  />
                )}
              />
            </div>
          )}
        </AdminCard>

        {/* Right: catalog details */}
        <div style={{ minWidth: 0 }}>
          {detailLoading ? (
            <AdminCard><Skeleton active paragraph={{ rows: 8 }} /></AdminCard>
          ) : detailError && selectedId ? (
            <div className={a.stateCard}>
              <LoadErrorState
                title="Could not load this catalog"
                text="The catalog details could not be loaded. Try again or check the system connection."
                onRetry={() => loadDetail(selectedId)}
              />
            </div>
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
              onAddSubCatalog={() => { setCreateParentId(selectedCatalog.id); setShowCreate(true); }}
              onMove={() => setShowMove(true)}
              onDelete={handleDelete}
              deleting={deleting}
            />
          ) : (
            <div className={a.stateCard}>
              <StateBlock
                kind="info"
                icon={<CarryOutOutlined />}
                title="Select a catalog"
                text="Choose a catalog from the tree to view simulations, assignments, and settings."
              />
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

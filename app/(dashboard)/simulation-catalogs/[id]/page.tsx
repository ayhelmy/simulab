'use client';

// Next.js 16: params is a Promise — must await in server components.
// This is a client component so we use use(params) instead.

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import {
  Tabs, Table, Tag, Button, Spin, Alert, Typography, Modal, Form,
  Input, Select, Popconfirm, App, Avatar, Breadcrumb, Card, Row, Col,
  Space, Statistic, Descriptions, Upload, Progress, Radio, Tooltip, type TableColumnsType,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, ExperimentOutlined,
  BankOutlined, EditOutlined, FolderOutlined, RightOutlined, HomeOutlined,
  WarningOutlined, DisconnectOutlined, UploadOutlined, PictureOutlined,
  LinkOutlined, CloudUploadOutlined, AimOutlined, OrderedListOutlined,
  CheckCircleOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload';
import PageHeader from '@/components/common/PageHeader';
import StatusTag from '@/components/common/StatusTag';
import {
  getCatalog, updateCatalog, addSimulationToCatalog, removeSimulationFromCatalog,
  listCatalogInstitutions, listSimulations, assignCatalogToInstitution, revokeCatalogFromInstitution,
  getCatalogUnassignImpact, updateCatalogSimulation, uploadSimulationThumbnail, uploadWebGLSimulation,
  uploadSimulationClickRegions, getSimulationSteps, saveSimulationSteps,
  type SimulationStep,
  type SimulationCatalogDetail, type AssignedInstitution, type UpdateCatalogData, type CatalogItem,
  type CatalogUnassignImpact,
} from '@/lib/simulations';
import { listInstitutions } from '@/lib/institutions';
import type { Simulation, SimulationCatalog } from '@/types';

const { Text } = Typography;

const DIFF_COLOR: Record<string, string> = {
  beginner: 'green', intermediate: 'blue', advanced: 'red',
};
const VIS_COLOR: Record<string, string> = {
  global: 'blue', institution: 'purple', demo_public: 'orange', demo_and_institution: 'gold',
};
const VIS_OPTIONS = [
  { value: 'global',               label: 'Global' },
  { value: 'institution',          label: 'Institution' },
  { value: 'demo_public',          label: 'Demo Public' },
  { value: 'demo_and_institution', label: 'Demo & Institution' },
];
const SIM_VIS_OPTIONS = [
  { value: 'private',              label: 'Private' },
  { value: 'institution',          label: 'Institution' },
  { value: 'demo_public',          label: 'Demo Public' },
  { value: 'demo_and_institution', label: 'Demo & Institution' },
];
const DIFF_OPTIONS = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
];
const STATUS_OPTIONS = [
  { value: 'draft',       label: 'Draft' },
  { value: 'active',      label: 'Active' },
  { value: 'deprecated',  label: 'Deprecated' },
];

// ── Thumbnail input — shared between Edit and Upload modals ───────────────────

function ThumbnailInput({
  currentUrl,
  onChange,
}: {
  currentUrl?: string | null;
  onChange: (url: string | null, file: File | null) => void;
}) {
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const [url,  setUrl]  = useState(currentUrl ?? '');

  return (
    <div>
      <Radio.Group
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{ marginBottom: 8 }}
        size="small"
      >
        <Radio.Button value="url">  <LinkOutlined /> URL</Radio.Button>
        <Radio.Button value="file"><UploadOutlined /> Upload file</Radio.Button>
      </Radio.Group>

      {mode === 'url' ? (
        <Input
          prefix={<PictureOutlined />}
          placeholder="https://example.com/thumbnail.jpg"
          value={url}
          onChange={(e) => { setUrl(e.target.value); onChange(e.target.value || null, null); }}
          allowClear
        />
      ) : (
        <Upload
          accept="image/jpeg,image/png,image/webp,image/gif"
          maxCount={1}
          listType="picture"
          beforeUpload={(file: RcFile) => {
            onChange(null, file as unknown as File);
            return false; // prevent auto-upload
          }}
          onRemove={() => onChange(null, null)}
        >
          <Button icon={<UploadOutlined />}>Choose image (JPEG/PNG/WebP/GIF, max 5 MB)</Button>
        </Upload>
      )}

      {currentUrl && mode === 'url' && !url && (
        <div style={{ marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Current: </Text>
          <img src={currentUrl} alt="current thumbnail" style={{ height: 40, objectFit: 'cover', borderRadius: 4, marginLeft: 4 }} />
        </div>
      )}
    </div>
  );
}

// -- Edit Simulation Modal -----------------------------------------------------

function EditSimulationModal({
  catalogId,
  simulation,
  onClose,
  onSuccess,
}: {
  catalogId:  string;
  simulation: CatalogItem;
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [form]    = Form.useForm();
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [thumbUrl,  setThumbUrl]  = useState<string | null>(simulation.thumbnailUrl ?? null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const { message } = App.useApp();

  function handleThumbnailChange(url: string | null, file: File | null) {
    setThumbUrl(url);
    setThumbFile(file);
  }

  async function handleFinish(values: {
    title: string;
    difficulty: string;
    status: string;
    visibility: string;
    estimatedMinutes?: number;
    description?: string;
    learningObjectives?: string[];
  }) {
    setSaving(true);
    setError(null);
    try {
      // Upload thumbnail file first if one was chosen
      let finalThumbUrl = thumbUrl;
      if (thumbFile) {
        const res = await uploadSimulationThumbnail(catalogId, simulation.simulationId, thumbFile);
        finalThumbUrl = res.thumbnailUrl;
      }

      await updateCatalogSimulation(catalogId, simulation.simulationId, {
        title:              values.title,
        difficulty:         values.difficulty as Simulation['difficulty'],
        status:             values.status     as Simulation['status'],
        visibility:         values.visibility  as Simulation['visibility'],
        estimatedMinutes:   values.estimatedMinutes   ?? undefined,
        description:        values.description        ?? undefined,
        thumbnailUrl:       finalThumbUrl             ?? undefined,
        learningObjectives: values.learningObjectives ?? [],
      });

      message.success('Simulation updated');
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.detail ?? e.title ?? 'Failed to update simulation');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={
        <Space>
          <EditOutlined />
          Edit Simulation
        </Space>
      }
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={saving}
      width={560}
      destroyOnHidden
    >
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          title:              simulation.title,
          difficulty:         simulation.difficulty,
          status:             simulation.status,
          visibility:         simulation.visibility ?? 'institution',
          estimatedMinutes:   simulation.estimatedMinutes ?? undefined,
          description:        simulation.description ?? undefined,
          learningObjectives: simulation.learningObjectives ?? [],
        }}
        onFinish={handleFinish}
      >
        <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Title is required' }]}>
          <Input />
        </Form.Item>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Difficulty" name="difficulty">
              <Select options={DIFF_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Status" name="status">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Est. minutes" name="estimatedMinutes">
              <Input type="number" min={1} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Visibility" name="visibility">
          <Select options={SIM_VIS_OPTIONS} />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item
          label="Learning Objectives"
          name="learningObjectives"
          tooltip="Type an objective and press Enter to add it."
        >
          <Select
            mode="tags"
            placeholder="e.g. Identify lab safety procedures…"
            tokenSeparators={[',']}
            style={{ width: '100%' }}
            notFoundContent={null}
          />
        </Form.Item>

        <Form.Item label="Thumbnail">
          <ThumbnailInput
            currentUrl={simulation.thumbnailUrl}
            onChange={handleThumbnailChange}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Click Regions Modal --------------------------------------------------------
// Uploads a reference screenshot + a COCO-style regions JSON for ONE simulation.
// Each simulation has its own independent region map; re-uploading replaces it.

function ClickRegionsModal({
  catalogId,
  simulation,
  onClose,
  onSuccess,
}: {
  catalogId:  string;
  simulation: CatalogItem;
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [jsonFile,  setJsonFile]  = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const { message } = App.useApp();

  async function handleUpload() {
    if (!imageFile) { setError('Select a reference image.'); return; }
    if (!jsonFile)  { setError('Select a regions JSON file.'); return; }
    setUploading(true);
    setError(null);
    try {
      const regionsText = await jsonFile.text();
      const result = await uploadSimulationClickRegions(
        catalogId, simulation.simulationId, imageFile, regionsText,
      );
      message.success(
        `Saved ${result.regionCount} region(s) (${result.imageWidth}×${result.imageHeight}px reference).`,
      );
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.detail ?? e.title ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open
      title={
        <Space>
          <AimOutlined />
          Click Regions — {simulation.title}
        </Space>
      }
      onCancel={onClose}
      onOk={handleUpload}
      okText="Upload"
      confirmLoading={uploading}
      width={520}
      destroyOnHidden
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        Maps recorded click coordinates to named components in the click-tracking
        CSV export. This replaces any existing region map for this simulation.
      </Text>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>Reference Screenshot</Text>
        <Upload
          accept="image/jpeg,image/png"
          maxCount={1}
          listType="picture"
          beforeUpload={(file: RcFile) => { setImageFile(file as unknown as File); return false; }}
          onRemove={() => setImageFile(null)}
        >
          <Button icon={<UploadOutlined />}>Choose image (JPEG/PNG)</Button>
        </Upload>
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>Regions JSON</Text>
        <Upload
          accept="application/json,.json"
          maxCount={1}
          beforeUpload={(file: RcFile) => { setJsonFile(file as unknown as File); return false; }}
          onRemove={() => setJsonFile(null)}
        >
          <Button icon={<UploadOutlined />}>Choose JSON file</Button>
        </Upload>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          COCO-style: categories[] + annotations[] with category_id and bbox [x, y, width, height].
        </Text>
      </div>
    </Modal>
  );
}

// -- Simulation Steps Modal ---------------------------------------------------
// Lets super-admin define an ordered list of required steps for a simulation.
// Each step has a label (display name) and a category name that must match
// a click-region category. After each session ends the backend checks whether
// the student performed every step in sequence.

interface StepDraft {
  key:          number;
  label:        string;
  categoryName: string;
}

function SimulationStepsModal({
  catalogId,
  simulation,
  onClose,
  onSuccess,
}: {
  catalogId:  string;
  simulation: CatalogItem;
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [steps,   setSteps]   = useState<StepDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [nextKey, setNextKey] = useState(1);
  const { message } = App.useApp();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSimulationSteps(catalogId, simulation.simulationId)
      .then((rows: SimulationStep[]) => {
        if (cancelled) return;
        if (rows.length > 0) {
          setSteps(rows.map((r, i) => ({ key: i + 1, label: r.label, categoryName: r.categoryName })));
          setNextKey(rows.length + 1);
        } else {
          setSteps([]);
          setNextKey(1);
        }
      })
      .catch(() => { if (!cancelled) setSteps([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [catalogId, simulation.simulationId]);

  function addStep() {
    setSteps(prev => [...prev, { key: nextKey, label: '', categoryName: '' }]);
    setNextKey(k => k + 1);
  }

  function removeStep(key: number) {
    setSteps(prev => prev.filter(s => s.key !== key));
  }

  function updateStep(key: number, field: 'label' | 'categoryName', value: string) {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
  }

  function moveStep(key: number, dir: -1 | 1) {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  async function handleSave() {
    for (const s of steps) {
      if (!s.label.trim())        { setError(`Step ${steps.indexOf(s) + 1}: label is required.`); return; }
      if (!s.categoryName.trim()) { setError(`Step ${steps.indexOf(s) + 1}: category name is required.`); return; }
    }
    setSaving(true);
    setError(null);
    try {
      const payload = steps.map((s, i) => ({
        stepOrder:    i + 1,
        label:        s.label.trim(),
        categoryName: s.categoryName.trim(),
      }));
      await saveSimulationSteps(catalogId, simulation.simulationId, payload);
      message.success(`${payload.length} step${payload.length !== 1 ? 's' : ''} saved for "${simulation.title}"`);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.detail ?? e.title ?? 'Failed to save steps');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={
        <Space>
          <OrderedListOutlined style={{ color: '#7C3AED' }} />
          Completion Steps — {simulation.title}
        </Space>
      }
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Steps"
      confirmLoading={saving}
      width={600}
      destroyOnHidden
    >
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 14 }}>
        Define the required sequence of component interactions. After each session ends the
        backend checks if the student completed every step in order and records{' '}
        <Text code style={{ fontSize: 11 }}>passed</Text> or{' '}
        <Text code style={{ fontSize: 11 }}>failed</Text> on the session.
        The <strong>Category Name</strong> must exactly match a name from the click-regions JSON
        (case-insensitive).
      </Text>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      <Spin spinning={loading}>
        {steps.length === 0 && !loading ? (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '16px 0' }}>
            No steps defined yet. Click "Add Step" to start.
          </Text>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {steps.map((step, idx) => (
              <div
                key={step.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', marginBottom: 6,
                  background: '#FAFAFA', borderRadius: 8,
                  border: '1px solid #E5E7EB',
                }}
              >
                <Avatar
                  size={26}
                  style={{ background: '#7C3AED', color: '#fff', fontSize: 12, flexShrink: 0 }}
                >
                  {idx + 1}
                </Avatar>

                <Input
                  placeholder="Step label (display name)"
                  value={step.label}
                  onChange={e => updateStep(step.key, 'label', e.target.value)}
                  style={{ flex: 2 }}
                  size="small"
                />
                <Input
                  placeholder="Category name"
                  value={step.categoryName}
                  onChange={e => updateStep(step.key, 'categoryName', e.target.value)}
                  style={{ flex: 2 }}
                  size="small"
                />

                <Space size={2} style={{ flexShrink: 0 }}>
                  <Button
                    size="small"
                    icon={<span style={{ fontSize: 10 }}>▲</span>}
                    disabled={idx === 0}
                    onClick={() => moveStep(step.key, -1)}
                  />
                  <Button
                    size="small"
                    icon={<span style={{ fontSize: 10 }}>▼</span>}
                    disabled={idx === steps.length - 1}
                    onClick={() => moveStep(step.key, 1)}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => removeStep(step.key)}
                  />
                </Space>
              </div>
            ))}
          </div>
        )}

        <Button
          icon={<PlusOutlined />}
          onClick={addStep}
          size="small"
          style={{ marginTop: 4 }}
        >
          Add Step
        </Button>
      </Spin>
    </Modal>
  );
}

// -- WebGL Upload Modal --------------------------------------------------------

function UploadSimulationModal({
  catalogId,
  onClose,
  onSuccess,
}: {
  catalogId: string;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [form]       = Form.useForm();
  const [zipFile,    setZipFile]    = useState<File | null>(null);
  const [thumbUrl,   setThumbUrl]   = useState<string | null>(null);
  const [thumbFile,  setThumbFile]  = useState<File | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState<string | null>(null);
  const { message } = App.useApp();

  async function handleFinish(values: {
    title: string;
    description?: string;
    difficulty: string;
    visibility: string;
    estimatedMinutes?: number;
    status: string;
  }) {
    if (!zipFile) { setError('Please select a ZIP file.'); return; }
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const result = await uploadWebGLSimulation(
        catalogId,
        {
          title:            values.title,
          description:      values.description,
          difficulty:       values.difficulty as Simulation['difficulty'],
          visibility:       values.visibility as Simulation['visibility'],
          status:           values.status    as Simulation['status'],
          estimatedMinutes: values.estimatedMinutes,
          thumbnailUrl:     thumbUrl ?? undefined,
        },
        zipFile,
        setProgress,
      );

      // Upload thumbnail file after simulation creation (we now have an ID)
      if (thumbFile) {
        try {
          await uploadSimulationThumbnail(catalogId, result.simulation.id, thumbFile);
        } catch (_) {
          message.warning('Simulation created, but thumbnail upload failed. You can re-upload it from Edit.');
        }
      }

      message.success('Simulation uploaded and linked to catalog');
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.detail ?? e.title ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      open
      title={
        <Space>
          <CloudUploadOutlined />
          Upload WebGL Simulation
        </Space>
      }
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Upload"
      confirmLoading={uploading}
      okButtonProps={{ disabled: !zipFile }}
      width={580}
      destroyOnHidden
    >
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      {uploading && (
        <Progress percent={progress} style={{ marginBottom: 16 }} />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ difficulty: 'intermediate', visibility: 'institution', status: 'active' }}
        onFinish={handleFinish}
      >
        <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Title is required' }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="Difficulty" name="difficulty">
              <Select options={DIFF_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Visibility" name="visibility">
              <Select options={SIM_VIS_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Est. minutes" name="estimatedMinutes">
              <Input type="number" min={1} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Status" name="status">
          <Select options={STATUS_OPTIONS} style={{ width: 160 }} />
        </Form.Item>

        <Form.Item label="WebGL ZIP file" required>
          <Upload
            accept=".zip,application/zip"
            maxCount={1}
            beforeUpload={(file: RcFile) => { setZipFile(file as unknown as File); return false; }}
            onRemove={() => setZipFile(null)}
          >
            <Button icon={<UploadOutlined />}>Select ZIP file</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="Thumbnail (optional)">
          <ThumbnailInput
            currentUrl={null}
            onChange={(url, file) => { setThumbUrl(url); setThumbFile(file); }}
          />
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
  catalog:   SimulationCatalogDetail;
  onClose:   () => void;
  onSuccess: (c: SimulationCatalog) => void;
}) {
  const [form]   = Form.useForm<UpdateCatalogData>();
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleFinish(values: UpdateCatalogData) {
    setSaving(true); setError(null);
    try {
      const updated = await updateCatalog(catalog.id, values);
      onSuccess(updated);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to update catalog');
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
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
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
            { value: 'draft',    label: 'Draft' },
            { value: 'active',   label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ]} />
        </Form.Item>
        <Form.Item label="Visibility" name="visibility">
          <Select options={VIS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Add Simulation Modal (legacy — link existing) ─────────────────────────────

function AddSimulationModal({
  catalogId,
  existingIds,
  onClose,
  onSuccess,
}: {
  catalogId:   string;
  existingIds: Set<string>;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selected,    setSelected]    = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [search,      setSearch]      = useState('');
  const { message } = App.useApp();

  useEffect(() => {
    listSimulations({ limit: 100 }).then(({ simulations: rows }) => {
      setSimulations(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = simulations.filter(
    (s) => !existingIds.has(s.id) &&
           s.title.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleAdd() {
    if (!selected.length) return;
    setSaving(true);
    try {
      await Promise.all(selected.map((id) => addSimulationToCatalog(catalogId, id)));
      message.success(`${selected.length} simulation${selected.length > 1 ? 's' : ''} added`);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to add simulation(s)');
    } finally {
      setSaving(false);
    }
  }

  const columns: TableColumnsType<Simulation> = [
    { title: 'Title', dataIndex: 'title', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'Type', dataIndex: 'type', width: 90, render: (t: string) => <Tag>{t.toUpperCase()}</Tag> },
    { title: 'Difficulty', dataIndex: 'difficulty', width: 110, render: (d: string) => <Tag color={DIFF_COLOR[d]}>{d}</Tag> },
  ];

  return (
    <Modal
      open
      title="Link Existing Simulation"
      onCancel={onClose}
      onOk={handleAdd}
      okText={`Add ${selected.length ? `(${selected.length})` : ''}`}
      confirmLoading={saving}
      okButtonProps={{ disabled: !selected.length }}
      width={640}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Search simulations…"
        allowClear
        style={{ marginBottom: 12 }}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys as string[]),
        }}
        scroll={{ y: 300 }}
        pagination={false}
      />
    </Modal>
  );
}

// -- Assign Institution Modal --------------------------------------------------

function AssignInstitutionModal({
  catalogId,
  assignedIds,
  onClose,
  onSuccess,
}: {
  catalogId:   string;
  assignedIds: Set<string>;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [institutions, setInstitutions] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selected,     setSelected]     = useState<string | undefined>();
  const [subtree,      setSubtree]      = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    listInstitutions({ limit: 200 })
      .then(({ institutions: rows }) => {
        setInstitutions(rows.filter((i) => !assignedIds.has(i.id)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignedIds]);

  async function handleAssign() {
    if (!selected) return;
    setSaving(true);
    try {
      await assignCatalogToInstitution(selected, catalogId, subtree);
      message.success('Catalog assigned to institution');
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
      title="Assign to Institution"
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
            placeholder="Select an institution"
            style={{ width: '100%' }}
            options={institutions.map((i) => ({ value: i.id, label: i.name }))}
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
              { value: true,  label: 'Yes — include entire subtree' },
              { value: false, label: 'No — this catalog only' },
            ]}
            onChange={setSubtree}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- Unassign Institution Modal ------------------------------------------------

const CONFIRM_KEYWORD = 'UNASSIGN';

function UnassignImpactModal({
  catalogId,
  institution,
  onClose,
  onSuccess,
}: {
  catalogId:   string;
  institution: AssignedInstitution;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [impact,        setImpact]        = useState<CatalogUnassignImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(true);
  const [impactError,   setImpactError]   = useState<string | null>(null);
  const [confirmText,   setConfirmText]   = useState('');
  const [unassigning,   setUnassigning]   = useState(false);
  const { message }  = App.useApp();
  const inputRef     = useRef<typeof Input>(null);

  useEffect(() => {
    setLoadingImpact(true);
    setImpactError(null);
    getCatalogUnassignImpact(catalogId, institution.id)
      .then(setImpact)
      .catch((err: { title?: string; detail?: string }) => {
        setImpactError(err.title ?? err.detail ?? 'Failed to load impact data');
      })
      .finally(() => setLoadingImpact(false));
  }, [catalogId, institution.id]);

  const hasImpact    = (impact?.affectedLessons ?? 0) > 0;
  const confirmValid = confirmText.trim().toUpperCase() === CONFIRM_KEYWORD;
  const canConfirm   = !loadingImpact && !impactError && confirmValid;

  async function handleConfirm() {
    setUnassigning(true);
    try {
      await revokeCatalogFromInstitution(institution.id, catalogId);
      message.success('Simulation catalog unassigned from institution successfully.');
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to unassign catalog');
    } finally {
      setUnassigning(false);
    }
  }

  return (
    <Modal
      open
      title={
        <Space>
          <DisconnectOutlined style={{ color: '#ff4d4f' }} />
          Unassign Catalog from Institution
        </Space>
      }
      onCancel={onClose}
      onOk={handleConfirm}
      okText="Confirm Unassignment"
      okButtonProps={{ danger: true, disabled: !canConfirm, loading: unassigning }}
      cancelButtonProps={{ disabled: unassigning }}
      width={560}
      destroyOnHidden
    >
      {loadingImpact && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin description="Calculating impact…" />
        </div>
      )}

      {impactError && (
        <Alert type="error" showIcon message={impactError} style={{ marginBottom: 16 }} />
      )}

      {!loadingImpact && !impactError && impact && (
        <>
          <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Institution">{institution.name}</Descriptions.Item>
            <Descriptions.Item label="Includes subtree">
              <Tag color={impact.includeSubtree ? 'blue' : 'default'}>
                {impact.includeSubtree ? 'Yes — entire subtree' : 'No — this catalog only'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {hasImpact ? (
            <>
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="Active usage detected"
                description="Unassigning will prevent instructors and students at this institution from accessing the simulations in this catalog."
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic title="Affected Courses"  value={impact.affectedCourses}  valueStyle={{ color: '#d46b08' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Affected Lessons"  value={impact.affectedLessons}  valueStyle={{ color: '#d46b08' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Affected Students" value={impact.affectedStudents} valueStyle={{ color: '#d46b08' }} />
                </Col>
              </Row>
              {impact.warnings.map((w, i) => (
                <Alert key={i} type="warning" showIcon message={w} style={{ marginBottom: 8 }} />
              ))}
              <Alert
                type="info"
                showIcon
                message="Existing course lessons will not be deleted. They will show an 'unavailable' state to students until access is restored."
                style={{ marginBottom: 16 }}
              />
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message="No active course lessons use simulations from this catalog. This unassignment has no immediate impact on students."
              style={{ marginBottom: 16 }}
            />
          )}

          <div>
            <Typography.Text strong>
              Type <Typography.Text code>{CONFIRM_KEYWORD}</Typography.Text> to confirm:
            </Typography.Text>
            <Input
              ref={inputRef as React.Ref<HTMLInputElement>}
              style={{ marginTop: 8 }}
              placeholder={CONFIRM_KEYWORD}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              status={confirmText && !confirmValid ? 'error' : undefined}
              onPressEnter={() => { if (canConfirm) handleConfirm(); }}
              autoFocus
            />
          </div>
        </>
      )}
    </Modal>
  );
}

// -- Main page ----------------------------------------------------------------─

interface Props {
  params: Promise<{ id: string }>;
}

export default function CatalogDetailPage({ params }: Props) {
  const { id } = use(params);

  const allowed = useRouteGuard(
    'simulation_catalogs.manage_global',
    'simulation_catalogs.view_assigned',
    'simulations.view_catalog',
  );
  const { hasPermission } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();

  const canManage = hasPermission('simulation_catalogs.manage_global');

  const [catalog,          setCatalog]          = useState<SimulationCatalogDetail | null>(null);
  const [institutions,     setInstitutions]     = useState<AssignedInstitution[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [showEdit,         setShowEdit]         = useState(false);
  const [showAddSim,       setShowAddSim]       = useState(false);
  const [showUploadSim,    setShowUploadSim]    = useState(false);
  const [showAssignOrg,    setShowAssignOrg]    = useState(false);
  const [removingItem,     setRemovingItem]     = useState<string | null>(null);
  const [unassignTarget,   setUnassignTarget]   = useState<AssignedInstitution | null>(null);
  const [editSimTarget,    setEditSimTarget]    = useState<CatalogItem | null>(null);
  const [regionsTarget,    setRegionsTarget]    = useState<CatalogItem | null>(null);
  const [stepsTarget,      setStepsTarget]      = useState<CatalogItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cat, insts] = await Promise.all([
        getCatalog(id),
        canManage ? listCatalogInstitutions(id) : Promise.resolve([]),
      ]);
      setCatalog(cat);
      setInstitutions(insts);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string; status?: number };
      if (e.status === 404) {
        setError('Catalog not found.');
      } else {
        setError(e.title ?? e.detail ?? 'Failed to load catalog');
      }
    } finally {
      setLoading(false);
    }
  }, [id, canManage]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  async function handleRemoveItem(simulationId: string) {
    setRemovingItem(simulationId);
    try {
      await removeSimulationFromCatalog(id, simulationId);
      setCatalog((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.simulationId !== simulationId) } : prev);
      message.success('Simulation removed from catalog');
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to remove simulation');
    } finally {
      setRemovingItem(null);
    }
  }

  function handleUnassignSuccess() {
    setUnassignTarget(null);
    load();
  }

  if (!allowed) return null;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (error || !catalog) {
    return <Alert type="error" message={error ?? 'Catalog not found'} showIcon style={{ margin: 24 }} />;
  }

  const itemCols: TableColumnsType<CatalogItem> = [
    {
      title: 'Simulation',
      render: (_, item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {item.thumbnailUrl ? (
            <Avatar src={item.thumbnailUrl} size={36} shape="square" />
          ) : (
            <Avatar size={36} shape="square" icon={<ExperimentOutlined />} style={{ background: '#F59324' }} />
          )}
          <div>
            <Text strong style={{ display: 'block', fontSize: 13 }}>{item.title}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {item.estimatedMinutes ? `${item.estimatedMinutes}m · ` : ''}{item.type.toUpperCase()}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      width: 110,
      render: (d: string) => <Tag color={DIFF_COLOR[d]}>{d}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} />,
    },
    ...(canManage ? [{
      title: '',
      key: 'actions',
      width: 172,
      render: (_: unknown, item: CatalogItem) => (
        <Space size={4}>
          <Tooltip title="Edit simulation">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => setEditSimTarget(item)}
            />
          </Tooltip>
          <Tooltip title="Click Regions (category mapping)">
            <Button
              size="small"
              icon={<AimOutlined />}
              onClick={() => setRegionsTarget(item)}
            />
          </Tooltip>
          <Tooltip title="Completion Steps">
            <Button
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => setStepsTarget(item)}
            />
          </Tooltip>
          <Popconfirm
            title="Remove from catalog?"
            onConfirm={() => handleRemoveItem(item.simulationId)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={removingItem === item.simulationId}
            />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ];

  const instCols: TableColumnsType<AssignedInstitution> = [
    {
      title: 'Institution',
      render: (_, inst) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} src={inst.logoUrl ?? undefined} style={{ background: '#F59324', flexShrink: 0 }}>
            {!inst.logoUrl && inst.name[0].toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>{inst.name}</Text>
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{inst.domain ?? inst.slug}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Subtree',
      dataIndex: 'includeSubtree',
      width: 90,
      render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Assigned',
      dataIndex: 'assignedAt',
      width: 150,
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Assigned by',
      dataIndex: 'assignedByEmail',
      width: 160,
      render: (e: string | null) => e ? <Text type="secondary" style={{ fontSize: 11 }}>{e}</Text> : '—',
    },
    {
      title: '',
      key: 'unassign',
      width: 100,
      render: (_: unknown, inst: AssignedInstitution) => (
        inst.isDirect ? (
          <Button
            size="small"
            danger
            icon={<DisconnectOutlined />}
            onClick={() => setUnassignTarget(inst)}
          >
            Unassign
          </Button>
        ) : (
          <Tag color="default" style={{ fontSize: 11 }}>Inherited</Tag>
        )
      ),
    },
  ];

  const existingSimIds  = new Set(catalog.items.map((i) => i.simulationId));
  const assignedInstIds = new Set(institutions.map((i) => i.id));

  const tabItems = [
    {
      key: 'simulations',
      label: `Simulations (${catalog.items.length})`,
      children: (
        <div>
          {canManage && (
            <Space style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                onClick={() => setShowUploadSim(true)}
              >
                Upload WebGL
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setShowAddSim(true)}
              >
                Link Existing
              </Button>
            </Space>
          )}
          {catalog.items.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message={canManage ? 'No simulations yet. Upload a WebGL build or link an existing simulation.' : 'This catalog has no simulations yet.'}
            />
          ) : (
            <Table
              dataSource={catalog.items}
              columns={itemCols}
              rowKey="simulationId"
              size="small"
              pagination={{ pageSize: 20 }}
            />
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
            <Button
              type="primary"
              icon={<BankOutlined />}
              onClick={() => setShowAssignOrg(true)}
            >
              Assign to Institution
            </Button>
          </div>
          {institutions.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="Not assigned to any institution yet. Use the button above to assign."
            />
          ) : (
            <Table
              dataSource={institutions}
              columns={instCols}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20 }}
            />
          )}
        </div>
      ),
    }] : []),
  ];

  // Build breadcrumb items from ancestors
  const breadcrumbItems = [
    {
      title: <a onClick={() => router.push('/simulation-catalogs')} style={{ cursor: 'pointer' }}><HomeOutlined /> Catalogs</a>,
    },
    ...(catalog.ancestors ?? []).map((a) => ({
      title: (
        <a onClick={() => router.push(`/simulation-catalogs/${a.id}`)} style={{ cursor: 'pointer' }}>
          <FolderOutlined /> {a.name}
        </a>
      ),
    })),
    { title: catalog.name },
  ];

  // Children navigation cards (sub-catalogs if returned)
  const children = (catalog as SimulationCatalogDetail & { children?: SimulationCatalog[] }).children ?? [];

  return (
    <div>
      {/* Ancestor breadcrumb */}
      {(catalog.ancestors?.length ?? 0) > 0 && (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 12 }} />
      )}

      <PageHeader
        title={catalog.name}
        subtitle={catalog.description ?? undefined}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/simulation-catalogs')}>
              Back
            </Button>
            {canManage && (
              <Button icon={<EditOutlined />} onClick={() => setShowEdit(true)}>
                Edit
              </Button>
            )}
          </Space>
        }
      />

      {/* Meta row */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tag color={VIS_COLOR[catalog.visibility] ?? 'default'} style={{ textTransform: 'capitalize' }}>
          {catalog.visibility.replace(/_/g, ' ')}
        </Tag>
        <StatusTag status={catalog.status} />
        {catalog.depth !== undefined && (
          <Text type="secondary" style={{ fontSize: 12 }}>Depth {catalog.depth}</Text>
        )}
        {catalog.slug && (
          <Text type="secondary" style={{ fontSize: 12 }}>/{catalog.slug}</Text>
        )}
        {catalog.parentId && (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontSize: 12 }}
            onClick={() => router.push(`/simulation-catalogs/${catalog.parentId}`)}
          >
            ↑ Parent catalog
          </Button>
        )}
      </div>

      {/* Sub-catalogs navigation */}
      {children.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Sub-catalogs</Text>
          <Row gutter={[12, 12]}>
            {children.map((child) => (
              <Col key={child.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => router.push(`/simulation-catalogs/${child.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FolderOutlined style={{ color: '#F59324', fontSize: 18 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>{child.name}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{child.itemCount ?? 0} sims</Text>
                    </div>
                    <RightOutlined style={{ color: '#ccc', fontSize: 11 }} />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      <Tabs items={tabItems} />

      {showEdit && (
        <EditCatalogModal
          catalog={catalog}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => {
            setShowEdit(false);
            setCatalog((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {showUploadSim && (
        <UploadSimulationModal
          catalogId={id}
          onClose={() => setShowUploadSim(false)}
          onSuccess={() => { setShowUploadSim(false); load(); }}
        />
      )}

      {showAddSim && (
        <AddSimulationModal
          catalogId={id}
          existingIds={existingSimIds}
          onClose={() => setShowAddSim(false)}
          onSuccess={() => { setShowAddSim(false); load(); }}
        />
      )}

      {showAssignOrg && (
        <AssignInstitutionModal
          catalogId={id}
          assignedIds={assignedInstIds}
          onClose={() => setShowAssignOrg(false)}
          onSuccess={() => { setShowAssignOrg(false); load(); }}
        />
      )}

      {unassignTarget && (
        <UnassignImpactModal
          catalogId={id}
          institution={unassignTarget}
          onClose={() => setUnassignTarget(null)}
          onSuccess={handleUnassignSuccess}
        />
      )}

      {editSimTarget && (
        <EditSimulationModal
          catalogId={id}
          simulation={editSimTarget}
          onClose={() => setEditSimTarget(null)}
          onSuccess={() => { setEditSimTarget(null); load(); }}
        />
      )}

      {regionsTarget && (
        <ClickRegionsModal
          catalogId={id}
          simulation={regionsTarget}
          onClose={() => setRegionsTarget(null)}
          onSuccess={() => setRegionsTarget(null)}
        />
      )}

      {stepsTarget && (
        <SimulationStepsModal
          catalogId={id}
          simulation={stepsTarget}
          onClose={() => setStepsTarget(null)}
          onSuccess={() => setStepsTarget(null)}
        />
      )}
    </div>
  );
}

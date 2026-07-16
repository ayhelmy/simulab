'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { uploadLessonFile } from '@/lib/files';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getCourse, updateCourse, publishCourse, archiveCourse, deleteCourse,
  getCourseSimulations,
} from '@/lib/courses';
import {
  getCourseTree, createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
} from '@/lib/modules';
import { listDepartments } from '@/lib/departments';
import { listAcademicYears } from '@/lib/academic-years';
import { listSemesterTerms } from '@/lib/semester-terms';
import type {
  Course, Simulation, CourseModule, Lesson,
  AcademicYear, SemesterTerm, LessonMode, ContentType,
} from '@/types';
import type { Department } from '@/lib/departments';
import {
  Form, Input, Select, InputNumber, Button, Card, Alert, Breadcrumb,
  Row, Col, Typography, Tag, Descriptions, Spin, Popconfirm, Space,
  Divider, App, Tabs, Modal, Radio, Empty, Switch, DatePicker, Tooltip,
  Upload,
} from 'antd';
import {
  RocketOutlined, InboxOutlined, DeleteOutlined, SaveOutlined,
  PlusOutlined, AppstoreOutlined, FileTextOutlined,
  VideoCameraOutlined, LinkOutlined, DownOutlined, RightOutlined,
  EditOutlined, LockOutlined, UnorderedListOutlined, ExperimentOutlined,
  MergeCellsOutlined, UploadOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Props { params: Promise<{ id: string }> }

// -- Constants ----------------------------------------------------------------─

const LESSON_MODE_OPTIONS: { value: LessonMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value:       'content',
    label:       'Content only',
    icon:        <FileTextOutlined />,
    description: 'Text, video, file, URL,  package.',
  },
  {
    value:       'simulation',
    label:       'Simulation only',
    icon:        <ExperimentOutlined />,
    description: 'Interactive simulation from your department catalog.',
  },
  {
    value:       'content_and_simulation',
    label:       'Content + Simulation',
    icon:        <MergeCellsOutlined />,
    description: 'Reading/media material followed by an interactive simulation.',
  },
];

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'rich_text', label: 'Rich Text',    icon: <FileTextOutlined /> },
  { value: 'video',     label: 'Video',         icon: <VideoCameraOutlined /> },
  { value: 'file',      label: 'File / PDF',    icon: <FileTextOutlined /> },
  { value: 'url',       label: 'External URL',  icon: <LinkOutlined /> },
];

const MODE_COLOR: Record<LessonMode, string> = {
  content:                '#1677FF',
  simulation:             '#52C41A',
  content_and_simulation: '#722ED1',
};

const MODE_TAG_COLOR: Record<LessonMode, string> = {
  content:                'blue',
  simulation:             'green',
  content_and_simulation: 'purple',
};

const MODE_LABEL: Record<LessonMode, string> = {
  content:                'Content',
  simulation:             'Simulation',
  content_and_simulation: 'Content+Sim',
};

// -- SimulationPicker ----------------------------------------------------------

function SimulationPicker({
  courseId, value, onChange,
}: { courseId: string; value?: string | null; onChange: (id: string) => void }) {
  const [sims, setSims]       = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    setLoading(true);
    getCourseSimulations(courseId)
      .then(setSims)
      .catch(() => setSims([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  const filtered = sims.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>;

  if (!sims.length) return (
    <Alert
      type="warning"
      showIcon
      message="No simulations available"
      description="This course has no department or the department has no catalog assignments. Assign a simulation catalog to the department first."
    />
  );

  return (
    <div>
      <Input.Search
        placeholder="Filter simulations…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(s => (
          <Card
            key={s.id}
            size="small"
            style={{
              cursor: 'pointer',
              borderColor: value === s.id ? '#1677FF' : undefined,
              background:  value === s.id ? '#FEF3E2' : undefined,
            }}
            onClick={() => onChange(s.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>{s.title}</Text>
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                  <Tag style={{ fontSize: 11 }}>{s.type}</Tag>
                  <Tag
                    color={s.difficulty === 'beginner' ? 'green' : s.difficulty === 'advanced' ? 'red' : 'orange'}
                    style={{ fontSize: 11 }}
                  >
                    {s.difficulty}
                  </Tag>
                  {s.estimatedMinutes && <Tag style={{ fontSize: 11 }}>{s.estimatedMinutes} min</Tag>}
                </div>
              </div>
              {value === s.id && <Tag color="blue">Selected</Tag>}
            </div>
          </Card>
        ))}
        {!filtered.length && <Text type="secondary">No simulations match your search.</Text>}
      </div>
    </div>
  );
}

// -- ContentEditor ------------------------------------------------------------─

function ContentEditor({
  contentType, content, onChange,
}: {
  contentType: ContentType;
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadLessonFile(file);
      onChange({ ...content, url: result.url, file_name: result.fileName, mime_type: result.mimeType });
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (contentType === 'rich_text') {
    return (
      <Form.Item label="Content">
        <TextArea
          rows={6}
          value={(content.body as string) ?? ''}
          onChange={e => onChange({ ...content, body: e.target.value })}
          placeholder="Write lesson content here…"
        />
      </Form.Item>
    );
  }

  if (contentType === 'video') {
    const fileName = (content.file_name as string) ?? '';
    const url      = (content.url as string) ?? '';
    return (
      <>
        <Form.Item label="Video File" required>
          {url && (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircleFilled style={{ color: '#52C41A' }} />
              <Text style={{ fontSize: 12 }}>{fileName || url}</Text>
            </div>
          )}
          <Upload
            accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => { handleUpload(file); return false; }}
          >
            <Button icon={<UploadOutlined />} loading={uploading}>
              {url ? 'Replace Video' : 'Upload Video'}
            </Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
            Accepted: MP4, WebM, MOV, AVI, OGG (max 200 MB)
          </Text>
        </Form.Item>
        <Form.Item label="Duration (seconds)">
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            value={(content.duration_sec as number) ?? undefined}
            onChange={v => onChange({ ...content, duration_sec: v ?? null })}
            placeholder="e.g. 600"
          />
        </Form.Item>
      </>
    );
  }

  if (contentType === 'file') {
    const fileName = (content.file_name as string) ?? '';
    const url      = (content.url as string) ?? '';
    return (
      <Form.Item label="File" required>
        {url && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleFilled style={{ color: '#52C41A' }} />
            <Text style={{ fontSize: 12 }}>{fileName || url}</Text>
          </div>
        )}
        <Upload
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => { handleUpload(file); return false; }}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            {url ? 'Replace File' : 'Upload File'}
          </Button>
        </Upload>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          Accepted: PDF, Word, PowerPoint, Excel, TXT (max 200 MB)
        </Text>
      </Form.Item>
    );
  }

  if (contentType === 'url') {
    return (
      <Form.Item label="External URL" required>
        <Input
          value={(content.url as string) ?? ''}
          onChange={e => onChange({ ...content, url: e.target.value })}
          placeholder="https://…"
        />
      </Form.Item>
    );
  }

  return null;
}

// -- AddLessonModal ------------------------------------------------------------

function AddLessonModal({
  open, courseId, moduleId, onClose, onAdded,
}: {
  open: boolean; courseId: string; moduleId: string;
  onClose: () => void; onAdded: () => void;
}) {
  const { message } = App.useApp();
  const [lessonMode,  setLessonMode]  = useState<LessonMode>('content');
  const [contentType, setContentType] = useState<ContentType>('rich_text');
  const [content,     setContent]     = useState<Record<string, unknown>>({});
  const [title,       setTitle]       = useState('');
  const [selectedSim, setSelectedSim] = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [estMins,     setEstMins]     = useState<number | null>(null);
  const [isRequired,  setIsRequired]  = useState(true);

  const needsContent = lessonMode === 'content' || lessonMode === 'content_and_simulation';
  const needsSim     = lessonMode === 'simulation' || lessonMode === 'content_and_simulation';

  const reset = () => {
    setTitle(''); setLessonMode('content'); setContentType('rich_text');
    setContent({}); setSelectedSim(null); setEstMins(null); setIsRequired(true);
  };

  const handleAdd = async () => {
    if (!title.trim()) { message.error('Lesson title is required.'); return; }
    if (needsSim && !selectedSim) { message.error('Select a simulation.'); return; }
    if (needsContent && !contentType) { message.error('Select a content type.'); return; }

    setSaving(true);
    try {
      await createLesson(courseId, moduleId, {
        title:        title.trim(),
        lessonMode,
        contentType:  needsContent ? contentType : null,
        content:      needsContent ? content : {},
        simulationId: needsSim ? selectedSim : null,
        estimatedMinutes: estMins,
        isRequired,
      });
      message.success('Lesson added.');
      onAdded();
      onClose();
      reset();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to add lesson.');
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      title="Add Lesson"
      onCancel={() => { onClose(); reset(); }}
      onOk={handleAdd}
      okText="Add Lesson"
      confirmLoading={saving}
      width={700}
      destroyOnHidden
    >
      <Form layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item label="Lesson Title" required>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Pump Curves"
          />
        </Form.Item>

        <Form.Item label="Lesson Mode" required>
          <Radio.Group
            value={lessonMode}
            onChange={e => { setLessonMode(e.target.value); setContent({}); setSelectedSim(null); }}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {LESSON_MODE_OPTIONS.map(opt => (
              <Radio.Button
                key={opt.value}
                value={opt.value}
                style={{ height: 'auto', padding: '6px 14px' }}
              >
                <span style={{ color: lessonMode === opt.value ? MODE_COLOR[opt.value] : undefined }}>
                  {opt.icon}
                </span>
                {' '}{opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
          <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
            {LESSON_MODE_OPTIONS.find(o => o.value === lessonMode)?.description}
          </Text>
        </Form.Item>

        {needsContent && (
          <>
            <Form.Item label="Content Type" required>
              <Radio.Group
                value={contentType}
                onChange={e => { setContentType(e.target.value); setContent({}); }}
              >
                {CONTENT_TYPE_OPTIONS.map(opt => (
                  <Radio.Button key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            <ContentEditor
              contentType={contentType}
              content={content}
              onChange={setContent}
            />
          </>
        )}

        {needsSim && (
          <Form.Item label="Simulation" required>
            <SimulationPicker
              courseId={courseId}
              value={selectedSim}
              onChange={setSelectedSim}
            />
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Estimated time (min)">
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                value={estMins ?? undefined}
                onChange={v => setEstMins(v ?? null)}
                placeholder="Optional"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Required for completion">
              <Switch checked={isRequired} onChange={setIsRequired} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// -- EditLessonModal ----------------------------------------------------------─

function EditLessonModal({
  open, lesson, courseId, moduleId, onClose, onUpdated,
}: {
  open: boolean; lesson: Lesson; courseId: string; moduleId: string;
  onClose: () => void; onUpdated: () => void;
}) {
  const { message } = App.useApp();
  const [title,       setTitle]       = useState(lesson.title);
  const [lessonMode,  setLessonMode]  = useState<LessonMode>(lesson.lessonMode ?? 'content');
  const [contentType, setContentType] = useState<ContentType>((lesson.contentType as ContentType) ?? 'rich_text');
  const [content,     setContent]     = useState<Record<string, unknown>>(lesson.content ?? {});
  const [selectedSim, setSelectedSim] = useState<string | null>(lesson.simulationId ?? null);
  const [estMins,     setEstMins]     = useState<number | null>(lesson.estimatedMinutes ?? null);
  const [isRequired,  setIsRequired]  = useState(lesson.isRequired);
  const [isPublished, setIsPublished] = useState(lesson.isPublished);
  const [saving,      setSaving]      = useState(false);

  const needsContent = lessonMode === 'content' || lessonMode === 'content_and_simulation';
  const needsSim     = lessonMode === 'simulation' || lessonMode === 'content_and_simulation';

  const handleSave = async () => {
    if (!title.trim()) { message.error('Lesson title is required.'); return; }
    if (needsSim && !selectedSim) { message.error('Select a simulation.'); return; }

    setSaving(true);
    try {
      await updateLesson(courseId, moduleId, lesson.id, {
        title:        title.trim(),
        lessonMode,
        contentType:  needsContent ? contentType : null,
        content:      needsContent ? content : {},
        simulationId: needsSim ? selectedSim : null,
        estimatedMinutes: estMins,
        isRequired,
        isPublished,
      });
      message.success('Lesson saved.');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to save lesson.');
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      title="Edit Lesson"
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      confirmLoading={saving}
      width={700}
      destroyOnHidden
    >
      <Form layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item label="Lesson Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </Form.Item>

        <Form.Item label="Lesson Mode">
          <Radio.Group
            value={lessonMode}
            onChange={e => setLessonMode(e.target.value)}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {LESSON_MODE_OPTIONS.map(opt => (
              <Radio.Button
                key={opt.value}
                value={opt.value}
                style={{ height: 'auto', padding: '6px 14px' }}
              >
                <span style={{ color: lessonMode === opt.value ? MODE_COLOR[opt.value] : undefined }}>
                  {opt.icon}
                </span>
                {' '}{opt.label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        {needsContent && (
          <>
            <Form.Item label="Content Type">
              <Radio.Group
                value={contentType}
                onChange={e => { setContentType(e.target.value); setContent({}); }}
              >
                {CONTENT_TYPE_OPTIONS.map(opt => (
                  <Radio.Button key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            <ContentEditor
              contentType={contentType}
              content={content}
              onChange={setContent}
            />
          </>
        )}

        {needsSim && (
          <Form.Item label="Simulation">
            <SimulationPicker
              courseId={courseId}
              value={selectedSim}
              onChange={setSelectedSim}
            />
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Estimated time (min)">
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                value={estMins ?? undefined}
                onChange={v => setEstMins(v ?? null)}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Required">
              <Switch checked={isRequired} onChange={setIsRequired} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Published">
              <Switch checked={isPublished} onChange={setIsPublished} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// -- LessonRow ----------------------------------------------------------------─

function LessonRow({
  lesson, courseId, moduleId, onDelete, onEdited, canEdit,
}: {
  lesson: Lesson; courseId: string; moduleId: string;
  onDelete: () => void; onEdited: () => void; canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const mode = lesson.lessonMode ?? 'content';

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 6, marginTop: 4,
      }}>
        <span style={{ color: MODE_COLOR[mode], fontSize: 13 }}>
          {mode === 'simulation'
            ? <ExperimentOutlined />
            : mode === 'content_and_simulation'
              ? <MergeCellsOutlined />
              : <FileTextOutlined />}
        </span>
        <Text style={{ flex: 1, fontSize: 13 }}>{lesson.title}</Text>
        <Tag color={MODE_TAG_COLOR[mode]} style={{ fontSize: 11 }}>
          {MODE_LABEL[mode]}
        </Tag>
        {lesson.contentType && (
          <Tag style={{ fontSize: 11, background: '#F3F4F6', color: '#374151' }}>
            {lesson.contentType}
          </Tag>
        )}
        {lesson.isRequired && <Tag color="red" style={{ fontSize: 11 }}>required</Tag>}
        {!lesson.isPublished && <Tag style={{ fontSize: 11 }}>draft</Tag>}
        {lesson.estimatedMinutes && (
          <Text type="secondary" style={{ fontSize: 11 }}>{lesson.estimatedMinutes}min</Text>
        )}
        {canEdit && (
          <>
            <Tooltip title="Edit lesson">
              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setEditOpen(true)} />
            </Tooltip>
            <Popconfirm
              title="Delete this lesson?"
              onConfirm={onDelete}
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger type="text" icon={<DeleteOutlined />} />
            </Popconfirm>
          </>
        )}
      </div>

      {editOpen && (
        <EditLessonModal
          open={editOpen}
          lesson={lesson}
          courseId={courseId}
          moduleId={moduleId}
          onClose={() => setEditOpen(false)}
          onUpdated={() => { onEdited(); setEditOpen(false); }}
        />
      )}
    </>
  );
}

// -- ModuleLockModal ----------------------------------------------------------─

function ModuleLockModal({
  open, mod, courseId, allModules, onClose, onSaved,
}: {
  open: boolean; mod: CourseModule; courseId: string; allModules: CourseModule[];
  onClose: () => void; onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [unlockAt, setUnlockAt] = useState(mod.unlockAt ? dayjs(mod.unlockAt) : null);
  const [prereqId, setPrereqId] = useState<string | null>(mod.prerequisiteModuleId ?? null);
  const [saving,   setSaving]   = useState(false);

  const otherModules = allModules.filter(m => m.id !== mod.id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateModule(courseId, mod.id, {
        unlockAt:             unlockAt ? unlockAt.toISOString() : null,
        prerequisiteModuleId: prereqId,
      });
      message.success('Lock settings saved.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to save lock settings.');
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      title={<><LockOutlined /> Lock Settings — {mod.title}</>}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          label="Unlock Date"
          extra="Leave blank to make the module always available (if published)."
        >
          <DatePicker
            showTime
            style={{ width: '100%' }}
            value={unlockAt}
            onChange={v => setUnlockAt(v)}
            placeholder="No timed release"
          />
        </Form.Item>

        <Form.Item
          label="Prerequisite Module"
          extra="Students must complete this module before unlocking the current one."
        >
          <Select
            allowClear
            value={prereqId ?? undefined}
            onChange={(v: string | undefined) => setPrereqId(v ?? null)}
            placeholder="No prerequisite"
            options={otherModules.map(m => ({ value: m.id, label: m.title }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// -- ModuleCard ----------------------------------------------------------------

function ModuleCard({
  mod, courseId, allModules, onDeleted, onRefresh, canEdit,
}: {
  mod: CourseModule; courseId: string; allModules: CourseModule[];
  onDeleted: () => void; onRefresh: () => void; canEdit: boolean;
}) {
  const { message } = App.useApp();
  const [expanded,     setExpanded]     = useState(false);
  const [addOpen,      setAddOpen]      = useState(false);
  const [lockOpen,     setLockOpen]     = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [editTitle,    setEditTitle]    = useState(mod.title);
  const [editSaving,   setEditSaving]   = useState(false);
  const [toggleLoad,   setToggleLoad]   = useState(false);

  const lessons: Lesson[] = mod.lessons ?? [];

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(courseId, mod.id, lessonId);
      message.success('Lesson deleted.');
      onRefresh();
    } catch { message.error('Failed to delete lesson.'); }
  };

  const handleTogglePublish = async () => {
    setToggleLoad(true);
    try {
      await updateModule(courseId, mod.id, { isPublished: !mod.isPublished });
      message.success(mod.isPublished ? 'Module set to draft.' : 'Module published.');
      onRefresh();
    } catch {
      message.error('Failed to update module status.');
    } finally { setToggleLoad(false); }
  };

  const handleEditTitle = async () => {
    if (!editTitle.trim()) return;
    setEditSaving(true);
    try {
      await updateModule(courseId, mod.id, { title: editTitle.trim() });
      message.success('Module renamed.');
      onRefresh();
      setEditOpen(false);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to rename module.');
    } finally { setEditSaving(false); }
  };

  const isLocked = !!(mod.unlockAt || mod.prerequisiteModuleId);

  return (
    <Card
      size="small"
      style={{ marginBottom: 10, border: '1px solid #D1D5DB' }}
      styles={{ body: { padding: '10px 14px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <RightOutlined />}
          onClick={() => setExpanded(v => !v)}
        />

        {editOpen && canEdit ? (
          <Input
            size="small"
            style={{ flex: 1 }}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onPressEnter={handleEditTitle}
            onBlur={() => setEditOpen(false)}
            autoFocus
          />
        ) : (
          <Text
            strong
            style={{ flex: 1, cursor: canEdit ? 'pointer' : undefined }}
            onClick={() => canEdit && setEditOpen(true)}
          >
            {mod.title}
          </Text>
        )}

        {editOpen && canEdit && (
          <Button size="small" loading={editSaving} onClick={handleEditTitle}>Save</Button>
        )}

        <Tag style={{ fontSize: 11, background: '#F3F4F6', color: '#374151' }}>
          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
        </Tag>
        {canEdit ? (
          <Tooltip title={mod.isPublished ? 'Click to set as draft' : 'Click to publish'}>
            <Space size={4}>
              <Switch
                size="small"
                checked={mod.isPublished}
                loading={toggleLoad}
                onChange={handleTogglePublish}
              />
              <Text style={{ fontSize: 11, color: mod.isPublished ? '#16A34A' : '#6B7280' }}>
                {mod.isPublished ? 'Published' : 'Draft'}
              </Text>
            </Space>
          </Tooltip>
        ) : (
          mod.isPublished
            ? <Tag color="green" style={{ fontSize: 11 }}>Published</Tag>
            : <Tag style={{ fontSize: 11 }}>Draft</Tag>
        )}
        {isLocked && (
          <Tooltip title={mod.unlockAt ? `Unlocks ${new Date(mod.unlockAt).toLocaleDateString()}` : 'Has prerequisite'}>
            <LockOutlined style={{ color: '#F59E0B', fontSize: 13 }} />
          </Tooltip>
        )}
        {canEdit && (
          <Space size={2}>
            <Tooltip title="Lock / unlock settings">
              <Button size="small" type="text" icon={<LockOutlined />} onClick={() => setLockOpen(true)} />
            </Tooltip>
            <Popconfirm
              title="Delete this module and all its lessons?"
              onConfirm={onDeleted}
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger type="text" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingLeft: 28 }}>
          {!lessons.length && (
            <Text type="secondary" style={{ fontSize: 12 }}>No lessons yet.</Text>
          )}
          {lessons.map(l => (
            <LessonRow
              key={l.id}
              lesson={l}
              courseId={courseId}
              moduleId={mod.id}
              canEdit={canEdit}
              onDelete={() => handleDeleteLesson(l.id)}
              onEdited={onRefresh}
            />
          ))}
          {canEdit && (
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              style={{ marginTop: 8 }}
              onClick={() => setAddOpen(true)}
            >
              Add Lesson
            </Button>
          )}
        </div>
      )}

      {addOpen && (
        <AddLessonModal
          open={addOpen}
          courseId={courseId}
          moduleId={mod.id}
          onClose={() => setAddOpen(false)}
          onAdded={onRefresh}
        />
      )}

      {lockOpen && (
        <ModuleLockModal
          open={lockOpen}
          mod={mod}
          courseId={courseId}
          allModules={allModules}
          onClose={() => setLockOpen(false)}
          onSaved={onRefresh}
        />
      )}
    </Card>
  );
}

// -- CourseBuilder ------------------------------------------------------------─

function CourseBuilder({ courseId, canEdit }: { courseId: string; canEdit: boolean }) {
  const { message } = App.useApp();
  const [modules,  setModules]  = useState<CourseModule[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [addOpen,  setAddOpen]  = useState(false);
  const [modTitle, setModTitle] = useState('');
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setModules(await getCourseTree(courseId)); }
    catch { setModules([]); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleAddModule = async () => {
    if (!modTitle.trim()) { message.error('Module title is required.'); return; }
    setSaving(true);
    try {
      await createModule(courseId, { title: modTitle.trim(), position: modules.length });
      message.success('Module added.');
      setModTitle('');
      setAddOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to add module.');
    } finally { setSaving(false); }
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await deleteModule(courseId, moduleId);
      message.success('Module deleted.');
      load();
    } catch { message.error('Failed to delete module.'); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <Text strong style={{ fontSize: 15 }}>
            <UnorderedListOutlined style={{ marginRight: 6 }} />
            Modules &amp; Lessons
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Each lesson can be content-only, simulation-only, or both.
              Simulations are filtered by this course&apos;s department catalog.
            </Text>
          </div>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add Module
          </Button>
        )}
      </div>

      {!modules.length && (
        <Empty description="No modules yet. Add the first module to start building this course." />
      )}

      {modules.map(mod => (
        <ModuleCard
          key={mod.id}
          mod={mod}
          courseId={courseId}
          allModules={modules}
          canEdit={canEdit}
          onDeleted={() => handleDeleteModule(mod.id)}
          onRefresh={load}
        />
      ))}

      <Modal
        open={addOpen}
        title="New Module"
        onCancel={() => { setAddOpen(false); setModTitle(''); }}
        onOk={handleAddModule}
        okText="Add Module"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label="Module Title" required>
            <Input
              value={modTitle}
              onChange={e => setModTitle(e.target.value)}
              placeholder="e.g. Module 1: Introduction"
              onPressEnter={handleAddModule}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// -- Main Page ----------------------------------------------------------------─

export default function EditCoursePage({ params }: Props) {
  const { id } = use(params);
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const hiddenForm = <Form form={form} style={{ display: 'none' }} />;

  const [course, setCourse]           = useState<Course | null>(null);
  const [loading, setLoading]         = useState(true);
  const [pageError, setPageError]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [actionBusy, setActionBusy]   = useState(false);
  const [departments, setDepts]       = useState<Department[]>([]);
  const [academicYears, setAcadYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms]             = useState<SemesterTerm[]>([]);
  const [yearsLoading, setYearsLoad]  = useState(false);
  const [termsLoading, setTermsLoad]  = useState(false);

  const isAdmin     = hasRole('super_admin') || hasRole('institution_admin');
  const isOwnCourse = course?.instructorId === user?.id;
  const canEdit     = isAdmin || isOwnCourse;
  const canDelete   = isAdmin;

  const deptName      = departments.find(d => d.id === course?.departmentId)?.name;
  const watchedDeptId = Form.useWatch('departmentId', form) as string | undefined;
  const watchedYearId = Form.useWatch('academicYearId', form) as string | undefined;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        const [c, depts] = await Promise.all([
          getCourse(id),
          user?.institutionId ? listDepartments(user.institutionId) : Promise.resolve([]),
        ]);
        setCourse(c);
        setDepts(depts);
        form.setFieldsValue({
          title:          c.title,
          description:    c.description ?? '',
          thumbnailUrl:   c.thumbnailUrl ?? '',
          departmentId:   c.departmentId ?? undefined,
          academicYearId: c.academicYearId ?? undefined,
          semesterTermId: c.semesterTermId ?? undefined,
          enrollmentType: c.enrollmentType,
          enrollmentCap:  c.enrollmentCap,
          passingGrade:   c.passingGrade,
        });
        if (c.departmentId) {
          listAcademicYears(c.departmentId).then(setAcadYears).catch(() => setAcadYears([]));
        }
        if (c.academicYearId) {
          listSemesterTerms(c.academicYearId).then(setTerms).catch(() => setTerms([]));
        }
      } catch (err: unknown) {
        const e = err as { detail?: string; title?: string };
        setPageError(e?.detail ?? e?.title ?? 'Failed to load course.');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadYears = async (deptId: string) => {
    setYearsLoad(true);
    setAcadYears([]);
    setTerms([]);
    form.setFieldsValue({ academicYearId: undefined, semesterTermId: undefined });
    try { setAcadYears(await listAcademicYears(deptId)); }
    catch { setAcadYears([]); }
    finally { setYearsLoad(false); }
  };

  const loadTerms = async (yearId: string) => {
    setTermsLoad(true);
    setTerms([]);
    form.setFieldsValue({ semesterTermId: undefined });
    try { setTerms(await listSemesterTerms(yearId)); }
    catch { setTerms([]); }
    finally { setTermsLoad(false); }
  };

  async function handleSave(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const updated = await updateCourse(id, {
        title:          (values.title as string).trim(),
        description:    (values.description as string | undefined)?.trim() || undefined,
        thumbnailUrl:   (values.thumbnailUrl as string | undefined)?.trim() || undefined,
        enrollmentType: values.enrollmentType as Course['enrollmentType'],
        enrollmentCap:  (values.enrollmentCap as number | null) ?? null,
        passingGrade:   (values.passingGrade as number) ?? 60,
        departmentId:   (values.departmentId as string | undefined) ?? null,
        academicYearId: (values.academicYearId as string | undefined) ?? null,
        semesterTermId: (values.semesterTermId as string | undefined) ?? null,
      });
      setCourse(updated ?? null);
      message.success('Changes saved.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function handlePublish() {
    setActionBusy(true);
    try {
      const updated = await publishCourse(id);
      setCourse(updated);
      message.success('Course published.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Publish failed.');
    } finally { setActionBusy(false); }
  }

  async function handleArchive() {
    setActionBusy(true);
    try {
      const updated = await archiveCourse(id);
      setCourse(updated);
      message.success('Course archived.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Archive failed.');
    } finally { setActionBusy(false); }
  }

  async function handleDelete() {
    setActionBusy(true);
    try {
      await deleteCourse(id);
      message.success('Course deleted.');
      router.push('/courses');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Delete failed.');
      setActionBusy(false);
    }
  }

  if (loading) {
    return <>{hiddenForm}<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div></>;
  }

  if (pageError || !course) {
    return <>{hiddenForm}<Alert
      type="error"
      message={pageError ?? 'Course not found'}
      showIcon
      action={<Link href="/courses"><Button size="small">Back to Courses</Button></Link>}
    /></>;
  }

  if (!canEdit) {
    return <>{hiddenForm}<div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
      <Text type="secondary">You don&apos;t have permission to edit this course.</Text>
      <br />
      <Link href={`/courses/${id}`}><Button type="link">← Back to Course</Button></Link>
    </div></>;
  }

  const settingsTab = (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 460px', minWidth: 0 }}>
        <Card>
          <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
            <Form.Item
              label="Course Title"
              name="title"
              rules={[{ required: true, message: 'Title is required.' }]}
            >
              <Input size="large" />
            </Form.Item>

            <Form.Item label="Description" name="description">
              <TextArea rows={4} showCount maxLength={2000} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Department"
                  name="departmentId"
                  extra="Controls which simulation catalogs are available."
                >
                  <Select
                    placeholder="No department"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    onChange={(v: string | undefined) => v ? loadYears(v) : (setAcadYears([]), setTerms([]))}
                    options={departments.map(d => ({ value: d.id, label: `${d.name} (${d.code})` }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Academic Year" name="academicYearId">
                  <Select
                    placeholder="Select year"
                    allowClear
                    loading={yearsLoading}
                    disabled={!watchedDeptId}
                    onChange={(v: string | undefined) => v ? loadTerms(v) : setTerms([])}
                    options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Semester Term" name="semesterTermId">
                  <Select
                    placeholder="Select term"
                    allowClear
                    loading={termsLoading}
                    disabled={!watchedYearId}
                    options={terms.map(t => ({ value: t.id, label: t.name }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Thumbnail URL" name="thumbnailUrl">
              <Input placeholder="https://…" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Enrollment Type" name="enrollmentType" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'open',     label: 'Open' },
                    { value: 'approval', label: 'Approval' },
                    { value: 'code',     label: 'Code' },
                    { value: 'admin',    label: 'Admin only' },
                  ]} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Passing Grade (%)" name="passingGrade">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Enrollment Cap" name="enrollmentCap" extra="Leave blank for unlimited">
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="Unlimited" />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Link href={`/courses/${id}`}><Button size="large">Cancel</Button></Link>
              <Button type="primary" htmlType="submit" loading={saving} size="large" icon={<SaveOutlined />}>
                Save Changes
              </Button>
            </div>
          </Form>
        </Card>
      </div>

      <div style={{ width: 240, flexShrink: 0 }}>
        <Card title="Publishing" size="small" style={{ marginBottom: 12 }}>
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Status">
              <StatusTag status={course.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Department">
              {deptName ? <Tag>{deptName}</Tag> : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            {course.academicYearId && (
              <Descriptions.Item label="Year">
                <Text style={{ fontSize: 12 }}>
                  {academicYears.find(y => y.id === course.academicYearId)?.name ?? '—'}
                </Text>
              </Descriptions.Item>
            )}
            {course.semesterTermId && (
              <Descriptions.Item label="Term">
                <Text style={{ fontSize: 12 }}>
                  {terms.find(t => t.id === course.semesterTermId)?.name ?? '—'}
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Created">
              {new Date(course.createdAt).toLocaleDateString()}
            </Descriptions.Item>
            {course.publishedAt && (
              <Descriptions.Item label="Published">
                {new Date(course.publishedAt).toLocaleDateString()}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Space orientation="vertical" style={{ width: '100%' }}>
            {course.status !== 'published' && (
              <Button
                type="primary"
                icon={<RocketOutlined />}
                loading={actionBusy}
                onClick={handlePublish}
                block
              >
                Publish
              </Button>
            )}
            {course.status !== 'archived' && (
              <Button
                icon={<InboxOutlined />}
                loading={actionBusy}
                onClick={handleArchive}
                block
              >
                Archive
              </Button>
            )}
          </Space>

          {canDelete && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Text type="danger" style={{ display: 'block', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                Danger Zone
              </Text>
              <Popconfirm
                title="Delete course?"
                description="This action cannot be undone."
                onConfirm={handleDelete}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />} loading={actionBusy} block>
                  Delete Course
                </Button>
              </Popconfirm>
            </>
          )}
        </Card>
      </div>
    </div>
  );

  const tabItems = [
    {
      key:      'settings',
      label:    'Settings',
      children: settingsTab,
    },
    {
      key:   'builder',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 4 }} />
          Builder
        </span>
      ),
      children: <CourseBuilder courseId={id} canEdit={canEdit} />,
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <Link href="/courses">Courses</Link> },
          { title: <Link href={`/courses/${id}`}>{course.title}</Link> },
          { title: 'Edit' },
        ]}
      /> */}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Edit Course</Title>
        <StatusTag status={course.status} />
        {deptName && <Tag color="blue">{deptName}</Tag>}
      </div>

      <Tabs items={tabItems} destroyInactiveTabPane={false} />
    </div>
  );
}

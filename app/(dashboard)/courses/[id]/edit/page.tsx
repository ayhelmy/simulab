'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { uploadLessonFile } from '@/lib/files';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getCourse, updateCourse, publishCourse, archiveCourse, deleteCourse,
  getCourseSimulations,
} from '@/lib/courses';
import {
  getCourseTree, createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
} from '@/lib/modules';
import { listQuizzes, createQuiz } from '@/lib/quizzes';
import { listDepartments } from '@/lib/departments';
import { listAcademicYears } from '@/lib/academic-years';
import { listSemesterTerms } from '@/lib/semester-terms';
import type {
  Course, Simulation, CourseModule, Lesson, Quiz,
  AcademicYear, SemesterTerm, LessonMode, ContentType,
} from '@/types';
import type { Department } from '@/lib/departments';
import {
  Form, Input, Select, InputNumber, Button, Card, Alert,
  Row, Col, Typography, Tag, Spin, Popconfirm, Space,
  Divider, App, Tabs, Modal, Empty, Switch, DatePicker, Tooltip,
  Upload, Segmented,
} from 'antd';
import {
  RocketOutlined, InboxOutlined, DeleteOutlined, SaveOutlined,
  PlusOutlined, AppstoreOutlined, FileTextOutlined,
  VideoCameraOutlined, LinkOutlined, DownOutlined, RightOutlined,
  EditOutlined, LockOutlined, ExperimentOutlined,
  MergeCellsOutlined, UploadOutlined, CheckCircleFilled, FormOutlined,
  CheckSquareOutlined, EyeOutlined, SettingOutlined, PictureOutlined,
} from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';
import {
  Chip, LessonTypeChip, formatDate, formatMinutes, learningStyles as s,
} from '@/components/student/studentUi';
import dayjs from 'dayjs';

// CKEditor is one of the heaviest deps in this app — load it only when a
// rich-text content editor is actually rendered.
const TextEditor = dynamic(() => import('@/components/editor/TextEditor'), {
  ssr: false,
  loading: () => <Spin size="small" />,
});

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
  {
    value:       'quiz',
    label:       'Quiz only',
    icon:        <FormOutlined />,
    description: 'A graded quiz with auto-scored questions.',
  },
  {
    value:       'content_and_quiz',
    label:       'Content + Quiz',
    icon:        <MergeCellsOutlined />,
    description: 'Reading/media material followed by a quiz.',
  },
  {
    value:       'simulation_and_quiz',
    label:       'Simulation + Quiz',
    icon:        <MergeCellsOutlined />,
    description: 'An interactive simulation followed by a quiz.',
  },
  {
    value:       'content_simulation_and_quiz',
    label:       'Content + Sim + Quiz',
    icon:        <MergeCellsOutlined />,
    description: 'Reading/media material, a simulation, and a quiz.',
  },
];

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'rich_text', label: 'Rich Text',    icon: <FileTextOutlined /> },
  { value: 'video',     label: 'Video',         icon: <VideoCameraOutlined /> },
  { value: 'file',      label: 'File / PDF',    icon: <FileTextOutlined /> },
  { value: 'url',       label: 'External URL',  icon: <LinkOutlined /> },
];

// BEDO palette — same mapping as the student course view (courses/[id]/home).
const MODE_COLOR: Record<LessonMode, string> = {
  content:                      '#6B7280',
  simulation:                   '#5C98B7',
  content_and_simulation:       '#2F5A70',
  quiz:                         '#F59324',
  content_and_quiz:             '#E07B15',
  simulation_and_quiz:          '#E07B15',
  content_simulation_and_quiz:  '#E07B15',
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

  // A simulation pre-selected elsewhere (Add to Course) that this course can't use.
  const unavailable = !!value && sims.length > 0 && !sims.some(x => x.id === value);

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
      {unavailable && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="The simulation you chose isn't in this course's department catalog."
          description="Pick one of the available simulations below, or ask your administrator to assign its catalog to the department."
        />
      )}
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
              borderColor: value === s.id ? '#F59324' : undefined,
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
                    color={s.difficulty === 'beginner' ? 'green' : s.difficulty === 'advanced' ? 'red' : 'blue'}
                    style={{ fontSize: 11 }}
                  >
                    {s.difficulty}
                  </Tag>
                  {s.estimatedMinutes && <Tag style={{ fontSize: 11 }}>{s.estimatedMinutes} min</Tag>}
                </div>
              </div>
              {value === s.id && <Tag color="orange">Selected</Tag>}
            </div>
          </Card>
        ))}
        {!filtered.length && <Text type="secondary">No simulations match your search.</Text>}
      </div>
    </div>
  );
}

// -- QuizPicker -----------------------------------------------------------------

function QuizPicker({
  courseId, value, onChange,
}: { courseId: string; value?: string | null; onChange: (id: string) => void }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, hasRole } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [creating, setCreating] = useState(false);

  // Only the quiz's own creator can attach it to a lesson (enforced server-side too, in
  // assertQuizAccess) — admins retain the ability to see and attach any quiz in the course.
  const canSeeAnyQuiz = hasRole('super_admin') || hasRole('institution_admin') || hasRole('dept_manager');

  const load = useCallback(() => {
    setLoading(true);
    listQuizzes(courseId)
      .then(list => setQuizzes(canSeeAnyQuiz ? list : list.filter(q => q.createdBy === user?.id)))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [courseId, canSeeAnyQuiz, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const quiz = await createQuiz(courseId, { title: 'Untitled Quiz' });
      router.push(`/courses/${courseId}/quizzes/${quiz.id}/edit`);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to create quiz.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = quizzes.filter(q =>
    !search || q.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        loading={creating}
        onClick={handleCreateNew}
        block
        style={{ marginBottom: 10 }}
      >
        Create New Quiz
      </Button>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
        Creating a new quiz opens its editor in this tab. Come back here afterwards and pick it from the list below.
      </Text>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
      ) : !quizzes.length ? (
        <Alert
          type="info"
          showIcon
          message="No quizzes yet"
          description="Use the button above to create the first quiz for this course."
        />
      ) : (
        <>
          <Input.Search
            placeholder="Filter quizzes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
            allowClear
          />
          <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(q => (
              <Card
                key={q.id}
                size="small"
                style={{
                  cursor: 'pointer',
                  borderColor: value === q.id ? '#F59324' : undefined,
                  background:  value === q.id ? '#FEF3E2' : undefined,
                }}
                onClick={() => onChange(q.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{q.title}</Text>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      <Tag color={q.status === 'published' ? 'green' : 'default'} style={{ fontSize: 11 }}>
                        {q.status}
                      </Tag>
                      <Tag style={{ fontSize: 11 }}>{q.pointsPossible} pts</Tag>
                    </div>
                  </div>
                  <Space size={4}>
                    {value === q.id && <Tag color="orange">Selected</Tag>}
                    <Tooltip title="Edit this quiz">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => { e.stopPropagation(); router.push(`/courses/${courseId}/quizzes/${q.id}/edit`); }}
                      />
                    </Tooltip>
                  </Space>
                </div>
              </Card>
            ))}
            {!filtered.length && <Text type="secondary">No quizzes match your search.</Text>}
          </div>
        </>
      )}
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
      <Form.Item label="Text">
        <TextEditor
          body={(content.body as string) ?? ''}
          onChange={body => onChange({ ...content, body })}
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
              <CheckCircleFilled style={{ color: '#059669' }} />
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
            <CheckCircleFilled style={{ color: '#059669' }} />
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

// -- LessonFormModal ------------------------------------------------------------
// One modal for adding and editing a lesson, with a single structure top to bottom:
// Lesson Title · Lesson Mode · Content (type + editor) · Simulation · Quiz ·
// Completion. Only the sections the selected mode uses are shown. The body scrolls;
// the footer (Cancel · Save Lesson) stays visible.

const CONTENT_MODES: LessonMode[] = ['content', 'content_and_simulation', 'content_and_quiz', 'content_simulation_and_quiz'];
const SIM_MODES: LessonMode[]     = ['simulation', 'content_and_simulation', 'simulation_and_quiz', 'content_simulation_and_quiz'];
const QUIZ_MODES: LessonMode[]    = ['quiz', 'content_and_quiz', 'simulation_and_quiz', 'content_simulation_and_quiz'];

function LessonFormModal({
  open, courseId, moduleId, lesson, initialSimulationId, onClose, onSaved,
}: {
  open: boolean; courseId: string; moduleId: string;
  /** Present when editing; absent when adding a new lesson. */
  lesson?: Lesson;
  /** Pre-selects a simulation (Add to Course from the Simulations page). */
  initialSimulationId?: string | null;
  onClose: () => void; onSaved: () => void;
}) {
  const { message } = App.useApp();
  const isEdit = !!lesson;
  const [title,        setTitle]        = useState(lesson?.title ?? '');
  const [lessonMode,   setLessonMode]   = useState<LessonMode>(lesson?.lessonMode ?? (initialSimulationId ? 'simulation' : 'content'));
  const [contentType,  setContentType]  = useState<ContentType>((lesson?.contentType as ContentType) ?? 'rich_text');
  const [content,      setContent]      = useState<Record<string, unknown>>(lesson?.content ?? {});
  const [selectedSim,  setSelectedSim]  = useState<string | null>(lesson?.simulationId ?? initialSimulationId ?? null);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(lesson?.quizId ?? null);
  const [estMins,      setEstMins]      = useState<number | null>(lesson?.estimatedMinutes ?? null);
  const [isRequired,   setIsRequired]   = useState(lesson?.isRequired ?? true);
  const [isPublished,  setIsPublished]  = useState(lesson?.isPublished ?? false);
  const [saving,       setSaving]       = useState(false);

  const needsContent = CONTENT_MODES.includes(lessonMode);
  const needsSim     = SIM_MODES.includes(lessonMode);
  const needsQuiz    = QUIZ_MODES.includes(lessonMode);
  const modeInfo     = LESSON_MODE_OPTIONS.find(o => o.value === lessonMode);

  const changeMode = (mode: LessonMode) => {
    setLessonMode(mode);
    // A new lesson starts each mode clean; an existing lesson keeps what it has.
    if (!isEdit) { setContent({}); setSelectedSim(initialSimulationId ?? null); setSelectedQuiz(null); }
  };

  const handleSave = async () => {
    if (!title.trim()) { message.error('Lesson title is required.'); return; }
    if (needsSim && !selectedSim) { message.error('Select a simulation.'); return; }
    if (needsQuiz && !selectedQuiz) { message.error('Select a quiz.'); return; }
    if (!isEdit && needsContent && !contentType) { message.error('Select a content type.'); return; }

    setSaving(true);
    try {
      const base = {
        title:        title.trim(),
        lessonMode,
        contentType:  needsContent ? contentType : null,
        content:      needsContent ? content : {},
        simulationId: needsSim ? selectedSim : null,
        quizId:       needsQuiz ? selectedQuiz : null,
        estimatedMinutes: estMins,
        isRequired,
      };
      if (lesson) {
        await updateLesson(courseId, moduleId, lesson.id, { ...base, isPublished });
        message.success('Lesson saved.');
      } else {
        await createLesson(courseId, moduleId, base);
        message.success('Lesson added.');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? (isEdit ? 'Failed to save lesson.' : 'Failed to add lesson.'));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Lesson' : 'Add Lesson'}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      rootClassName={s.page}
      styles={{ body: { maxHeight: 'calc(100vh - 230px)', overflowY: 'auto', paddingRight: 4 } }}
      footer={
        <div className={s.modalFooter}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            {isEdit ? 'Save Lesson' : 'Add Lesson'}
          </Button>
        </div>
      }
    >
      <Form layout="vertical" requiredMark={false} className={s.lessonForm}>
        <section className={s.modalSection}>
          <Form.Item label="Lesson Title" required style={{ marginBottom: 0 }}>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Pump Curves"
            />
          </Form.Item>
        </section>

        <section className={s.modalSection} aria-labelledby="lesson-mode-title">
          <h4 className={s.modalSectionTitle} id="lesson-mode-title">Lesson Mode</h4>
          <div className={s.modeGrid} role="radiogroup" aria-labelledby="lesson-mode-title">
            {LESSON_MODE_OPTIONS.map(opt => {
              const active = lessonMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${s.modeOption} ${active ? s.modeOptionActive : ''}`}
                  onClick={() => changeMode(opt.value)}
                >
                  <span className={s.modeOptionIcon} aria-hidden>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {modeInfo && <p className={s.modalHelp}>{modeInfo.description}</p>}
        </section>

        {needsContent && (
          <section className={s.modalSection} aria-labelledby="lesson-content-title">
            <h4 className={s.modalSectionTitle} id="lesson-content-title">Content</h4>
            <Form.Item label="Content Type">
              <Segmented
                value={contentType}
                onChange={v => { setContentType(v as ContentType); setContent({}); }}
                options={CONTENT_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label, icon: opt.icon }))}
              />
            </Form.Item>
            <ContentEditor contentType={contentType} content={content} onChange={setContent} />
          </section>
        )}

        {needsSim && (
          <section className={s.modalSection} aria-labelledby="lesson-sim-title">
            <h4 className={s.modalSectionTitle} id="lesson-sim-title">Simulation</h4>
            <SimulationPicker courseId={courseId} value={selectedSim} onChange={setSelectedSim} />
          </section>
        )}

        {needsQuiz && (
          <section className={s.modalSection} aria-labelledby="lesson-quiz-title">
            <h4 className={s.modalSectionTitle} id="lesson-quiz-title">Quiz</h4>
            <QuizPicker courseId={courseId} value={selectedQuiz} onChange={setSelectedQuiz} />
          </section>
        )}

        <section className={s.modalSection} aria-labelledby="lesson-completion-title">
          <h4 className={s.modalSectionTitle} id="lesson-completion-title">Completion</h4>
          <Row gutter={16}>
            <Col xs={24} sm={isEdit ? 8 : 12}>
              <Form.Item label="Duration (min)" style={{ marginBottom: 0 }}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  value={estMins ?? undefined}
                  onChange={v => setEstMins(v ?? null)}
                  placeholder="Optional"
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={isEdit ? 8 : 12}>
              <Form.Item label="Required for completion" style={{ marginBottom: 0 }}>
                <Switch checked={isRequired} onChange={setIsRequired} />
              </Form.Item>
            </Col>
            {isEdit && (
              <Col xs={12} sm={8}>
                <Form.Item label="Published" style={{ marginBottom: 0 }}>
                  <Switch checked={isPublished} onChange={setIsPublished} />
                </Form.Item>
              </Col>
            )}
          </Row>
        </section>
      </Form>
    </Modal>
  );
}

// -- LessonRow ----------------------------------------------------------------─

function LessonRow({
  lesson, courseId, moduleId, onDelete, onEdited, canEdit, focused,
}: {
  lesson: Lesson; courseId: string; moduleId: string;
  onDelete: () => void; onEdited: () => void; canEdit: boolean;
  /** Opened from a lesson's Edit link on the course overview (?lesson=). */
  focused?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(!!focused && canEdit);
  const mode = lesson.lessonMode ?? 'content';
  const contentLabel = lesson.contentType
    ? CONTENT_TYPE_OPTIONS.find(o => o.value === lesson.contentType)?.label ?? lesson.contentType
    : null;
  // Meta line, not badges: content type and duration (max three badges per row).
  const meta = [contentLabel, formatMinutes(lesson.estimatedMinutes)].filter(Boolean).join(' · ');

  return (
    <>
      <div id={`lesson-${lesson.id}`} className={`${s.builderRow} ${focused ? s.builderRowFocused : ''}`}>
        <span style={{ color: MODE_COLOR[mode], fontSize: 15 }} aria-hidden>
          {mode === 'simulation'
            ? <ExperimentOutlined />
            : mode === 'quiz'
              ? <FormOutlined />
              : mode.includes('_and_')
                ? <MergeCellsOutlined />
                : <FileTextOutlined />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className={s.lessonTitle}>{lesson.title}</div>
          <div className={s.metaRow} style={{ marginTop: 4 }}>
            <LessonTypeChip mode={mode} small />
            {lesson.isRequired && <Chip tone="neutral" className={s.chipSm}>Required</Chip>}
            {!lesson.isPublished && <Chip tone="warning" className={s.chipSm}>Draft</Chip>}
            {meta && <span className={s.meta}>{meta}</span>}
          </div>
        </div>
        <div className={s.rowActions}>
          <Link href={`/courses/${courseId}/home?activity=${lesson.id}`}>
            <Button size="small" type="text" icon={<EyeOutlined />}>Preview</Button>
          </Link>
          {canEdit && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)}>Edit</Button>
              <Popconfirm
                title="Delete this activity?"
                description={`"${lesson.title}" will be removed from the module.`}
                onConfirm={onDelete}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger type="text" icon={<DeleteOutlined />}>Delete</Button>
              </Popconfirm>
            </>
          )}
        </div>
      </div>

      {editOpen && (
        <LessonFormModal
          open={editOpen}
          lesson={lesson}
          courseId={courseId}
          moduleId={moduleId}
          onClose={() => {
            setEditOpen(false);
            // Opened from the course overview: land on the row once the modal closes.
            if (focused) document.getElementById(`lesson-${lesson.id}`)?.scrollIntoView({ block: 'center' });
          }}
          onSaved={onEdited}
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
  mod, index, courseId, allModules, onDeleted, onRefresh, canEdit, focusLessonId, addSimId,
}: {
  mod: CourseModule; index: number; courseId: string; allModules: CourseModule[];
  onDeleted: () => void; onRefresh: () => void; canEdit: boolean;
  /** Lesson to open for editing on arrival (?lesson=). */
  focusLessonId?: string | null;
  /** Simulation chosen on the Simulations page (?addSim=) — offer "Add simulation here". */
  addSimId?: string | null;
}) {
  const { message } = App.useApp();
  const [expanded,     setExpanded]     = useState(true);
  const [addOpen,      setAddOpen]      = useState(false);
  const [addWithSim,   setAddWithSim]   = useState(false);
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
  const openAdd = (withSim: boolean) => { setAddWithSim(withSim); setAddOpen(true); };

  return (
    <section className={`${s.panel} ${s.builderModule}`} aria-label={`Module ${index + 1}: ${mod.title}`}>
      <div className={s.builderModuleHead}>
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <RightOutlined />}
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse module' : 'Expand module'}
        />
        <span className={s.moduleIndex}>{index + 1}</span>

        <div className={s.builderModuleTitle}>
          {editOpen && canEdit ? (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                size="small"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onPressEnter={handleEditTitle}
                onKeyDown={e => { if (e.key === 'Escape') setEditOpen(false); }}
                autoFocus
                aria-label="Module title"
              />
              <Button size="small" type="primary" loading={editSaving} onClick={handleEditTitle}>Save</Button>
              <Button size="small" onClick={() => { setEditOpen(false); setEditTitle(mod.title); }}>Cancel</Button>
            </Space.Compact>
          ) : (
            <>
              <span className={s.moduleTitle}>{mod.title}</span>
              <span className={s.meta}>
                {lessons.length} activit{lessons.length !== 1 ? 'ies' : 'y'}
                {isLocked && (
                  <> · <LockOutlined /> {mod.unlockAt ? `Unlocks ${formatDate(mod.unlockAt)}` : 'Has a prerequisite'}</>
                )}
              </span>
            </>
          )}
        </div>

        <div className={s.builderModuleActions}>
          {canEdit ? (
            <Tooltip title={mod.isPublished ? 'Students can see this module. Switch off to set it to draft.' : 'Hidden from students. Switch on to publish.'}>
              <label className={s.publishToggle}>
                <Switch size="small" checked={mod.isPublished} loading={toggleLoad} onChange={handleTogglePublish} />
                <span style={{ color: mod.isPublished ? 'var(--sl-success)' : 'var(--sl-text-secondary)' }}>
                  {mod.isPublished ? 'Published' : 'Draft'}
                </span>
              </label>
            </Tooltip>
          ) : (
            mod.isPublished
              ? <Chip tone="success" className={s.chipSm}>Published</Chip>
              : <Chip tone="warning" className={s.chipSm}>Draft</Chip>
          )}
          {canEdit && !editOpen && (
            <>
              <Tooltip title="Rename module">
                <Button size="small" type="text" icon={<EditOutlined />} aria-label="Rename module" onClick={() => setEditOpen(true)} />
              </Tooltip>
              <Tooltip title="Release date and prerequisite">
                <Button size="small" type="text" icon={<LockOutlined />} aria-label="Lock settings" onClick={() => setLockOpen(true)} />
              </Tooltip>
              <Popconfirm
                title="Delete this module?"
                description={`"${mod.title}" and all its activities will be removed. This cannot be undone.`}
                onConfirm={onDeleted}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger type="text" icon={<DeleteOutlined />} aria-label="Delete module" />
              </Popconfirm>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className={s.builderModuleBody}>
          {!lessons.length && (
            <p className={s.meta} style={{ margin: '4px 0 0' }}>No activities yet. Add the first one below.</p>
          )}
          {lessons.map(l => (
            <LessonRow
              key={l.id}
              lesson={l}
              courseId={courseId}
              moduleId={mod.id}
              canEdit={canEdit}
              focused={l.id === focusLessonId}
              onDelete={() => handleDeleteLesson(l.id)}
              onEdited={onRefresh}
            />
          ))}
          {canEdit && (
            <div className={s.actionRow} style={{ marginTop: 10 }}>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => openAdd(false)}>
                Add Activity
              </Button>
              {addSimId && (
                <Button size="small" icon={<ExperimentOutlined />} onClick={() => openAdd(true)}>
                  Add simulation here
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {addOpen && (
        <LessonFormModal
          open={addOpen}
          courseId={courseId}
          moduleId={mod.id}
          initialSimulationId={addWithSim ? addSimId : null}
          onClose={() => setAddOpen(false)}
          onSaved={onRefresh}
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
    </section>
  );
}

// -- CourseBuilder ------------------------------------------------------------─

function CourseBuilder({
  courseId, canEdit, focusLessonId, addSimId, onClearAddSim,
}: {
  courseId: string; canEdit: boolean;
  focusLessonId?: string | null;
  addSimId?: string | null;
  onClearAddSim: () => void;
}) {
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

  const lessonsAll = modules.flatMap(m => m.lessons ?? []);
  const simCount   = lessonsAll.filter(l => l.lessonMode?.includes('simulation')).length;
  const quizCount  = lessonsAll.filter(l => l.lessonMode?.includes('quiz')).length;

  return (
    <div>
      <div className={`${s.panel} ${s.builderHead}`}>
        <div style={{ minWidth: 0 }}>
          <h2 className={s.sectionTitle} style={{ margin: 0 }}>Course Content</h2>
          <p className={s.meta} style={{ margin: '4px 0 0' }}>
            {modules.length} module{modules.length !== 1 ? 's' : ''} · {lessonsAll.length} activit{lessonsAll.length !== 1 ? 'ies' : 'y'}
            {' · '}{simCount} simulation{simCount !== 1 ? 's' : ''} · {quizCount} quiz{quizCount !== 1 ? 'zes' : ''}
          </p>
          <p className={s.meta} style={{ margin: '2px 0 0' }}>
            An activity can be content, an interactive simulation, a quiz, or a combination.
            Simulations come from this course&apos;s department catalog. Changes here save as you make them.
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add Module
          </Button>
        )}
      </div>

      {addSimId && canEdit && (
        <Alert
          type="info"
          showIcon
          icon={<ExperimentOutlined />}
          style={{ marginBottom: 12 }}
          title={modules.length
            ? 'Choose the module for your simulation, then select “Add simulation here”.'
            : 'Add a module first, then add your simulation to it.'}
          action={<Button size="small" type="text" onClick={onClearAddSim}>Dismiss</Button>}
        />
      )}

      {!modules.length && (
        <div className={s.panel} style={{ padding: 24 }}>
          <Empty description="No modules yet. Add the first module to start building this course." />
        </div>
      )}

      {modules.map((mod, i) => (
        <ModuleCard
          key={mod.id}
          mod={mod}
          index={i}
          courseId={courseId}
          allModules={modules}
          canEdit={canEdit}
          focusLessonId={focusLessonId}
          addSimId={addSimId}
          onDeleted={() => handleDeleteModule(mod.id)}
          onRefresh={load}
        />
      ))}

      {canEdit && modules.length > 0 && (
        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setAddOpen(true)} style={{ marginTop: 4 }}>
          Add Module
        </Button>
      )}

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

  // Readable names even when the lookup lists fail to load (never show raw IDs).
  const deptName      = departments.find(d => d.id === course?.departmentId)?.name ?? course?.departmentName ?? undefined;
  const searchParams  = useSearchParams();
  // Deep links: ?lesson= opens that lesson's editor; ?addSim= comes from Add to Course.
  const focusLessonId = searchParams.get('lesson');
  const [addSimId, setAddSimId] = useState<string | null>(searchParams.get('addSim'));
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'builder' || focusLessonId || addSimId ? 'builder' : 'settings',
  );
  const [thumbEditing, setThumbEditing] = useState(false);
  const watchedThumb  = Form.useWatch('thumbnailUrl', form) as string | undefined;
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

  // Current value first if the loaded list doesn't contain it, so selects show names, not IDs.
  const withCurrent = (
    opts: { value: string; label: string }[], value?: string | null, label?: string | null,
  ) => (value && label && !opts.some(o => o.value === value) ? [{ value, label }, ...opts] : opts);

  const deptOptions = withCurrent(
    departments.map(d => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name })),
    course.departmentId, course.departmentName,
  );
  const yearOptions = withCurrent(
    academicYears.map(y => ({ value: y.id, label: y.name })),
    course.academicYearId, course.academicYearName,
  );
  const termOptions = withCurrent(
    terms.map(t => ({ value: t.id, label: t.name })),
    course.semesterTermId, course.semesterTermName,
  );
  const yearName = academicYears.find(y => y.id === course.academicYearId)?.name ?? course.academicYearName;
  const termName = terms.find(t => t.id === course.semesterTermId)?.name ?? course.semesterTermName;
  const thumbIsData = !!watchedThumb?.startsWith('data:');

  const settingsTab = (
    <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
      <div className={s.editGrid}>
        <div className={s.editMain}>
          {/* A — Basic information */}
          <section className={`${s.panel} ${s.formSection}`} aria-labelledby="sec-basic">
            <h3 className={s.formSectionTitle} id="sec-basic">Basic Information</h3>
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

            <Form.Item label="Thumbnail" style={{ marginBottom: 0 }}>
              <div className={s.thumbField}>
                <div
                  className={s.thumbPreview}
                  style={watchedThumb ? { backgroundImage: `url(${watchedThumb})` } : undefined}
                  aria-label={watchedThumb ? 'Current thumbnail' : 'No thumbnail'}
                >
                  {!watchedThumb && <PictureOutlined />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    {watchedThumb
                      ? (thumbIsData ? 'Embedded image' : 'Image from a web address')
                      : 'No thumbnail yet. Students see a placeholder.'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Shown on course cards and the course overview. Use a 16:9 simulation screenshot.
                  </Text>
                  <Button size="small" icon={<PictureOutlined />} onClick={() => setThumbEditing(v => !v)}>
                    {thumbEditing ? 'Done' : watchedThumb ? 'Replace thumbnail' : 'Add thumbnail'}
                  </Button>
                </div>
              </div>
            </Form.Item>
            {/* The URL field stays mounted so the value is always submitted. */}
            <Form.Item
              name="thumbnailUrl"
              label="Image address"
              extra="Paste the web address of the image."
              hidden={!thumbEditing}
              style={{ marginTop: 12 }}
            >
              <Input placeholder="https://…" allowClear />
            </Form.Item>
          </section>

          {/* B — Academic setup */}
          <section className={`${s.panel} ${s.formSection}`} aria-labelledby="sec-academic">
            <h3 className={s.formSectionTitle} id="sec-academic">Academic Setup</h3>
            <Row gutter={16}>
              <Col xs={24} md={8}>
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
                    options={deptOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Academic Year" name="academicYearId">
                  <Select
                    placeholder="Select year"
                    allowClear
                    loading={yearsLoading}
                    disabled={!watchedDeptId}
                    onChange={(v: string | undefined) => v ? loadTerms(v) : setTerms([])}
                    options={yearOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Semester Term" name="semesterTermId">
                  <Select
                    placeholder="Select term"
                    allowClear
                    loading={termsLoading}
                    disabled={!watchedYearId}
                    options={termOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
          </section>

          {/* C — Enrollment settings */}
          <section className={`${s.panel} ${s.formSection}`} aria-labelledby="sec-enroll">
            <h3 className={s.formSectionTitle} id="sec-enroll">Enrollment Settings</h3>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item label="Enrollment Type" name="enrollmentType" rules={[{ required: true }]}>
                  <Select options={[
                    { value: 'open',     label: 'Open' },
                    { value: 'approval', label: 'Approval' },
                    { value: 'code',     label: 'Code' },
                    { value: 'admin',    label: 'Admin only' },
                  ]} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Enrollment Cap" name="enrollmentCap" extra="Leave blank for unlimited">
                  <InputNumber min={1} style={{ width: '100%' }} placeholder="Unlimited" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item label="Passing Grade (%)" name="passingGrade">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </section>

          <div className={s.formFooter}>
            <Link href={`/courses/${id}`}><Button size="large">Cancel</Button></Link>
            <Button type="primary" htmlType="submit" loading={saving} size="large" icon={<SaveOutlined />}>
              Save Changes
            </Button>
          </div>
        </div>

        {/* D — Publishing */}
        <aside className={s.editSide}>
          <section className={`${s.panel} ${s.formSection}`} aria-labelledby="sec-publish">
            <h3 className={s.formSectionTitle} id="sec-publish">Publishing</h3>
            <dl className={s.railList} style={{ marginTop: 0 }}>
              <dt>Status</dt><dd><StatusTag status={course.status} /></dd>
              <dt>Department</dt><dd>{deptName ?? '—'}</dd>
              {yearName && <><dt>Academic Year</dt><dd>{yearName}</dd></>}
              {termName && <><dt>Semester</dt><dd>{termName}</dd></>}
              <dt>Created</dt><dd>{formatDate(course.createdAt)}</dd>
              {course.publishedAt && <><dt>Published</dt><dd>{formatDate(course.publishedAt)}</dd></>}
            </dl>

            <div className={s.railActions} style={{ marginTop: 14 }}>
              {course.status !== 'published' && (
                <Button icon={<RocketOutlined />} loading={actionBusy} onClick={handlePublish} block>
                  Publish Course
                </Button>
              )}
              {course.status !== 'archived' && (
                <Button icon={<InboxOutlined />} loading={actionBusy} onClick={handleArchive} block>
                  Archive
                </Button>
              )}
            </div>

            {canDelete && (
              <>
                <Divider style={{ margin: '16px 0 10px' }} />
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
          </section>
        </aside>
      </div>
    </Form>
  );

  const tabItems = [
    {
      key:      'settings',
      label:    <span><SettingOutlined style={{ marginRight: 6 }} />Settings</span>,
      children: settingsTab,
    },
    {
      key:   'builder',
      label: <span><AppstoreOutlined style={{ marginRight: 6 }} />Builder</span>,
      children: (
        <CourseBuilder
          courseId={id}
          canEdit={canEdit}
          focusLessonId={focusLessonId}
          addSimId={addSimId}
          onClearAddSim={() => { setAddSimId(null); router.replace(`/courses/${id}/edit?tab=builder`, { scroll: false }); }}
        />
      ),
    },
  ];

  return (
    <div className={s.page} style={{ maxWidth: 1120, margin: '0 auto' }}>
      {/* Sticky header — the main action (Save Changes) is always visible */}
      <div className={`${s.panel} ${s.editBar}`}>
        <div style={{ minWidth: 0 }}>
          <div className={s.metaRow}>
            <Title level={4} style={{ margin: 0 }}>Edit Course</Title>
            <StatusTag status={course.status} />
            {course.code && <Chip tone="info">{course.code}</Chip>}
          </div>
          <span className={s.meta}>
            {course.title}{deptName ? ` · ${deptName}` : ''}{termName ? ` · ${termName}` : ''}
          </span>
        </div>
        <div className={s.editBarActions}>
          <Link href={`/courses/${id}`}><Button>Cancel</Button></Link>
          <Link href={`/courses/${id}/home`}><Button icon={<EyeOutlined />}>Preview Course</Button></Link>
          <Link href={`/courses/${id}/grade`}><Button icon={<CheckSquareOutlined />}>Grade Submissions</Button></Link>
          {activeTab === 'settings' ? (
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>
              Save Changes
            </Button>
          ) : (
            <span className={s.autosaveNote}><CheckCircleFilled aria-hidden /> Builder changes save automatically</span>
          )}
        </div>
      </div>

      <Tabs
        className={s.editTabs}
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        destroyInactiveTabPane={false}
      />
    </div>
  );
}

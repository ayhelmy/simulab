'use client';

/**
 * Course Journey Page — SRS §4.8 PRG-01; §4.15 CMS-01 to CMS-04.
 * Route: /courses/:id/home
 *
 * Layout (desktop): lesson content left (2/3) | course tree right (1/3, sticky).
 * Layout (mobile):  full-width content + Drawer for the course tree.
 *
 * Lesson modes:
 *   content                → content renderer only
 *   simulation             → simulation card + "Start Simulation" button
 *   content_and_simulation → content renderer then simulation card
 *
 * "Start Simulation" calls the course-safe launch endpoint and navigates
 * to /simulations/:id/play?courseId=...&lessonId=...
 */

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourseJourney } from '@/lib/journey';
import { markLessonComplete } from '@/lib/modules';
import { getLatestActivityForLesson } from '@/lib/simulation-activity';
import type {
  CourseJourney, JourneyModule, JourneyLesson,
  LessonMode, LatestActivitySession,
} from '@/types';
import {
  Row, Col, Card, Typography, Tag, Progress, Button, Spin, Alert,
  Result, Breadcrumb, Collapse, Divider, Space, Drawer, Tooltip, App,
  Badge,
} from 'antd';
import {
  LockOutlined, CheckCircleOutlined, FileTextOutlined,
  ExperimentOutlined, MergeCellsOutlined, MenuOutlined,
  ArrowLeftOutlined, ArrowRightOutlined, PlayCircleOutlined,
  ClockCircleOutlined, ThunderboltOutlined, LinkOutlined,
  DownloadOutlined, VideoCameraOutlined, BookOutlined,
} from '@ant-design/icons';

import TextEditor from '@/components/editor/TextEditor';

const { Title, Text, Paragraph } = Typography;

interface Props { params: Promise<{ id: string }> }

// -- Colour helpers ------------------------------------------------------------─

const MODE_COLOR: Record<LessonMode, string> = {
  content: '#1677FF',
  simulation: '#52C41A',
  content_and_simulation: '#722ED1',
};
const MODE_LABEL: Record<LessonMode, string> = {
  content: 'Content',
  simulation: 'Simulation',
  content_and_simulation: 'Content + Sim',
};
const MODE_TAG: Record<LessonMode, string> = {
  content: 'blue',
  simulation: 'green',
  content_and_simulation: 'purple',
};
const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'green',
  intermediate: 'orange',
  advanced: 'red',
};

function modeIcon(mode: LessonMode, style?: React.CSSProperties) {
  const s = { fontSize: 14, ...style };
  if (mode === 'simulation') return <ExperimentOutlined style={s} />;
  if (mode === 'content_and_simulation') return <MergeCellsOutlined style={s} />;
  return <FileTextOutlined style={s} />;
}

// -- CourseProgressHeader ------------------------------------------------------─

function CourseProgressHeader({
  journey, courseId, onOpenTree,
}: {
  journey: CourseJourney;
  courseId: string;
  onOpenTree: () => void;
}) {
  const { course, progress } = journey;
  return (
    <Card
      size="small"
      style={{ marginBottom: 16, borderRadius: 8 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Row align="middle" gutter={[12, 8]}>
        <Col flex="1 1 0">
          <Space size={6} wrap>
            <Title level={5} style={{ margin: 0 }}>{course.title}</Title>
            {course.departmentName && (
              <Tag color="blue" style={{ fontSize: 11 }}>{course.departmentName}</Tag>
            )}
            {course.academicYearName && (
              <Tag color="geekblue" style={{ fontSize: 11 }}>{course.academicYearName}</Tag>
            )}
            {course.semesterTermName && (
              <Tag color="cyan" style={{ fontSize: 11 }}>{course.semesterTermName}</Tag>
            )}
          </Space>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Progress
              percent={progress.percentage}
              size="small"
              style={{ flex: 1, maxWidth: 320, marginBottom: 0 }}
              strokeColor={{ '0%': '#1677FF', '100%': '#52C41A' }}
            />
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              {progress.completedLessons} / {progress.totalLessons} lessons
            </Text>
          </div>
        </Col>
        <Col flex="0 0 auto">
          <Space size={8}>
            <Link href={`/courses/${courseId}`}>
              <Button size="small" icon={<ArrowLeftOutlined />}>Course</Button>
            </Link>
            <Button
              size="small"
              icon={<MenuOutlined />}
              onClick={onOpenTree}
            >
              Contents
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

// -- LockedLessonState ----------------------------------------------------------

function LockedLessonState({ lesson, module }: { lesson: JourneyLesson; module: JourneyModule }) {
  const reason = module.unlockAt
    ? `This module unlocks on ${new Date(module.unlockAt).toLocaleDateString()}.`
    : module.prerequisiteModuleId
      ? 'Complete the prerequisite module to unlock this content.'
      : 'This lesson is not yet available.';

  return (
    <Result
      icon={<LockOutlined style={{ color: '#9CA3AF' }} />}
      title="Lesson Locked"
      subTitle={
        <Space orientation="vertical" size={4} style={{ textAlign: 'center' }}>
          <Text type="secondary">{lesson.title}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>{reason}</Text>
        </Space>
      }
    />
  );
}

// -- LessonSimulationPlaceholder ------------------------------------------------

function LessonSimulationPlaceholder({
  lesson, courseId,
}: { lesson: JourneyLesson; courseId: string }) {
  const router = useRouter();
  const sim = lesson.simulation;
  const [launching, setLaunching] = useState(false);
  const [lastSession, setLastSession] = useState<LatestActivitySession | null | undefined>(undefined);

  const isWebGL = sim?.launchType === 'webgl';
  const buildReady = !isWebGL || sim?.buildStatus === 'ready';
  const hasSimId = !!lesson.simulationId;

  // Load latest completed activity session for this lesson (best-effort)
  useEffect(() => {
    if (!hasSimId || !lesson.simulationId) return;
    getLatestActivityForLesson(lesson.id, lesson.simulationId)
      .then(setLastSession)
      .catch(() => setLastSession(null));
  }, [lesson.id, lesson.simulationId, hasSimId]);

  function handleLaunch() {
    if (!hasSimId) return;
    setLaunching(true);
    // The play page calls startSimulationActivity on mount — no pre-launch needed here
    const url = `/simulations/${lesson.simulationId}/play?courseId=${courseId}&lessonId=${lesson.id}`;
    router.push(url);
  }

  return (
    <Card
      style={{
        border: `2px dashed ${buildReady ? '#7C3AED' : '#D1D5DB'}`,
        borderRadius: 10,
        background: '#FAFBFF',
        marginTop: 8,
      }}
      styles={{ body: { padding: 24 } }}
    >
      <Space align="start" size={16}>
        <div style={{
          width: 56, height: 56, borderRadius: 10,
          background: 'linear-gradient(135deg,#7C3AED,#2563EB)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ExperimentOutlined style={{ color: '#fff', fontSize: 26 }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Space wrap size={6} style={{ marginBottom: 6 }}>
            <Tag color="purple" style={{ fontSize: 12 }}>Simulation</Tag>
            {isWebGL && <Tag color="geekblue" icon={<ThunderboltOutlined />} style={{ fontSize: 11 }}>Unity WebGL</Tag>}
            {sim?.difficulty && (
              <Tag color={DIFFICULTY_COLOR[sim.difficulty] ?? 'default'} style={{ fontSize: 11 }}>
                {sim.difficulty.charAt(0).toUpperCase() + sim.difficulty.slice(1)}
              </Tag>
            )}
            {(sim?.estimatedMinutes ?? lesson.estimatedMinutes) != null && (
              <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
                {sim?.estimatedMinutes ?? lesson.estimatedMinutes} min
              </Tag>
            )}
          </Space>

          <Title level={5} style={{ margin: '0 0 6px' }}>
            {sim?.title ?? lesson.title}
          </Title>

          {sim?.description && (
            <Paragraph
              type="secondary"
              style={{ fontSize: 13, marginBottom: 12 }}
              ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
            >
              {sim.description}
            </Paragraph>
          )}

          <Space wrap size={8}>
            {!hasSimId ? (
              <Tooltip title="No simulation is linked to this lesson.">
                <Button icon={<PlayCircleOutlined />} disabled>Start Simulation</Button>
              </Tooltip>
            ) : !buildReady ? (
              <Tooltip title={`Build status: ${sim?.buildStatus ?? 'unknown'}. Please wait.`}>
                <Button icon={<PlayCircleOutlined />} disabled>Build Not Ready</Button>
              </Tooltip>
            ) : (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={launching}
                onClick={handleLaunch}
              >
                {lastSession ? 'Launch Again' : 'Start Simulation'}
              </Button>
            )}
          </Space>

          {/* Last session summary */}
          {lastSession && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              background: '#F0F4FF',
              borderRadius: 6,
              border: '1px solid #D0DBFF',
            }}>
              <Text style={{ fontSize: 12, color: '#4B5563' }}>
                <CheckCircleOutlined style={{ color: '#059669', marginRight: 6 }} />
                <strong>Last session:</strong>{' '}
                {new Date(lastSession.startedAt).toLocaleDateString()}{' '}
                &mdash; Duration: <strong>{lastSession.formattedDuration}</strong>{' '}
                &mdash; Status:{' '}
                <Tag
                  color={lastSession.status === 'ended' ? 'green' : 'orange'}
                  style={{ fontSize: 11, margin: 0 }}
                >
                  {lastSession.status}
                </Tag>
              </Text>
            </div>
          )}
        </div>
      </Space>
    </Card>
  );
}

// -- LessonContentRenderer ------------------------------------------------------

function LessonContentRenderer({ lesson }: { lesson: JourneyLesson }) {
  const { contentType, content } = lesson;

  if (!contentType) return null;

  if (contentType === 'rich_text') {
    const body = (content.body as string) ?? '';
    return body ? (
      // <div style={{
      //   fontSize: 15, lineHeight: 1.8, color: '#111827',
      //   whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      // }}>
      //   {body}
      // </div>
     <TextEditor
  body={body}
  readOnly
/>

    ) : (
      <Text type="secondary">No content available for this lesson.</Text>
    );
  }

  if (contentType === 'video') {
    const url = (content.url as string) ?? '';
    if (!url) return <Text type="secondary">Video URL not configured.</Text>;

    let embedUrl = url;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
        embedUrl = `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
      } else if (u.hostname === 'youtu.be') {
        embedUrl = `https://www.youtube.com/embed${u.pathname}`;
      }
    } catch { /* not a URL shape — fall through */ }

    if (embedUrl !== url) {
      return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      );
    }

    // Uploaded video file — play inline
    const mimeType = (content.mime_type as string) ?? 'video/mp4';
    return (
      <video
        controls
        style={{ width: '100%', borderRadius: 8, maxHeight: 480, background: '#000' }}
      >
        <source src={url} type={mimeType} />
        <Text type="secondary">Your browser does not support video playback.</Text>
      </video>
    );
  }

  if (contentType === 'file') {
    const url      = (content.url as string) ?? '';
    const fileName = (content.file_name as string) ?? 'File';
    const mimeType = (content.mime_type as string) ?? '';

    if (!url) return <Text type="secondary">File not available.</Text>;

    // PDF — display inline
    if (mimeType === 'application/pdf' || url.toLowerCase().endsWith('.pdf')) {
      return (
        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{fileName}</Text>
            <a href={url} target="_blank" rel="noopener noreferrer" download={fileName}>
              <Button size="small" icon={<DownloadOutlined />}>Download</Button>
            </a>
          </div>
          <iframe
            src={url}
            title={fileName}
            style={{ width: '100%', height: 620, border: '1px solid #E5E7EB', borderRadius: 6 }}
          />
        </div>
      );
    }

    // Video file stored as file content type — play inline
    if (mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(url)) {
      return (
        <video
          controls
          style={{ width: '100%', borderRadius: 8, maxHeight: 480, background: '#000' }}
        >
          <source src={url} type={mimeType || 'video/mp4'} />
          <Text type="secondary">Your browser does not support video playback.</Text>
        </video>
      );
    }

    // Other file types — download link
    return (
      <Card size="small" style={{ background: '#F9FAFB' }}>
        <Space>
          <DownloadOutlined style={{ fontSize: 20, color: '#7C3AED' }} />
          <div>
            <Text strong>{fileName}</Text>
            <div>
              <a href={url} target="_blank" rel="noopener noreferrer" download={fileName}>
                <Button type="link" icon={<DownloadOutlined />} style={{ padding: 0 }}>Download</Button>
              </a>
            </div>
          </div>
        </Space>
      </Card>
    );
  }

  if (contentType === 'url') {
    const url = (content.url as string) ?? '';
    return (
      <Card size="small" style={{ background: '#F9FAFB' }}>
        <Space>
          <LinkOutlined style={{ fontSize: 20, color: '#059669' }} />
          <div>
            <Text strong>External Resource</Text>
            <div>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button type="link" icon={<LinkOutlined />} style={{ padding: 0 }}>Open Link</Button>
              </a>
            </div>
          </div>
        </Space>
      </Card>
    );
  }



  return <Text type="secondary">Unsupported content type: {contentType}</Text>;
}

// -- LessonCompletionButton ----------------------------------------------------

function LessonCompletionButton({
  lesson, moduleId, courseId, onComplete,
}: {
  lesson: JourneyLesson;
  moduleId: string;
  courseId: string;
  onComplete: () => void;
}) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);

  const isCompleted = lesson.completionStatus === 'completed';

  if (isCompleted) {
    return (
      <Button
        icon={<CheckCircleOutlined />}
        style={{ color: '#059669', borderColor: '#059669', background: '#ECFDF5' }}
        disabled
      >
        Completed
      </Button>
    );
  }

  const handleComplete = async () => {
    setBusy(true);
    try {
      await markLessonComplete(courseId, moduleId, lesson.id);
      message.success('Lesson marked as complete!');
      onComplete();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to mark lesson as complete.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="primary" icon={<CheckCircleOutlined />} loading={busy} onClick={handleComplete}>
      Mark as Complete
    </Button>
  );
}

// -- CourseTreePanel ------------------------------------------------------------

function CourseTreePanel({
  modules, selectedLessonId, onSelectLesson,
}: {
  modules: JourneyModule[];
  selectedLessonId: string | null;
  onSelectLesson: (lesson: JourneyLesson, module: JourneyModule) => void;
}) {
  const defaultKeys = modules
    .filter(m => !m.isLocked && m.lessons.some(l => l.id === selectedLessonId || l.completionStatus !== 'completed'))
    .map(m => m.id);

  return (
    <div style={{ fontSize: 13 }}>
      <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid #F0F0F0', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 13 }}>Course Contents</Text>
        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
          {modules.reduce((n, m) => n + m.lessons.length, 0)} lessons
        </Text>
      </div>

      <Collapse
        size="small"
        ghost
        defaultActiveKey={defaultKeys.length ? defaultKeys : modules.map(m => m.id)}
        items={modules.map((mod) => ({
          key: mod.id,
          label: (
            <Space size={4} style={{ width: '100%' }}>
              {mod.isLocked
                ? <LockOutlined style={{ color: '#9CA3AF', fontSize: 11 }} />
                : <BookOutlined style={{ color: '#1677FF', fontSize: 11 }} />
              }
              <Text
                strong
                style={{ fontSize: 12, color: mod.isLocked ? '#9CA3AF' : '#111827', flex: 1 }}
              >
                {mod.title}
              </Text>
              <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>
                {mod.lessons.filter(l => l.completionStatus === 'completed').length}/{mod.lessons.length}
              </Text>
            </Space>
          ),
          children: (
            <div style={{ paddingLeft: 4 }}>
              {mod.lessons.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12, paddingLeft: 8 }}>No lessons</Text>
              ) : (
                mod.lessons.map((lesson) => {
                  const isSelected = lesson.id === selectedLessonId;
                  const isCompleted = lesson.completionStatus === 'completed';
                  const isLocked = lesson.isLocked;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson, mod)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 8px',
                        borderRadius: 6,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        background: isSelected ? '#FEF3E2' : 'transparent',
                        borderLeft: isSelected ? '3px solid #1677FF' : '3px solid transparent',
                        marginBottom: 2,
                        opacity: isLocked ? 0.5 : 1,
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ flexShrink: 0, fontSize: 12 }}>
                        {isLocked
                          ? <LockOutlined style={{ color: '#9CA3AF' }} />
                          : isCompleted
                            ? <CheckCircleOutlined style={{ color: '#059669' }} />
                            : modeIcon(lesson.lessonMode, { color: MODE_COLOR[lesson.lessonMode] })
                        }
                      </span>

                      <Text style={{
                        flex: 1,
                        fontSize: 12,
                        color: isLocked ? '#9CA3AF' : isSelected ? '#1677FF' : '#374151',
                        fontWeight: isSelected ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {lesson.title}
                      </Text>

                      <Space size={3} style={{ flexShrink: 0 }}>
                        <Tag
                          color={MODE_TAG[lesson.lessonMode]}
                          style={{ fontSize: 9, padding: '0 4px', margin: 0 }}
                        >
                          {MODE_LABEL[lesson.lessonMode]}
                        </Tag>
                        {lesson.isRequired && (
                          <Badge color="#F59E0B" style={{ transform: 'scale(0.75)' }} />
                        )}
                      </Space>
                    </div>
                  );
                })
              )}
            </div>
          ),
        }))}
      />
    </div>
  );
}

// -- LessonView (renders a single lesson with prev/next controls) --------------

function LessonView({
  lesson, module, courseId, flatLessons, currentIndex,
  onNavigate, onComplete,
}: {
  lesson: JourneyLesson;
  module: JourneyModule;
  courseId: string;
  flatLessons: Array<{ lesson: JourneyLesson; module: JourneyModule }>;
  currentIndex: number;
  onNavigate: (lesson: JourneyLesson, module: JourneyModule) => void;
  onComplete: () => void;
}) {
  const { message } = App.useApp();
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < flatLessons.length - 1;

  const goToPrev = () => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const { lesson: l, module: m } = flatLessons[i];
      if (l.isLocked) { message.warning(`"${l.title}" is locked.`); return; }
      onNavigate(l, m); return;
    }
  };

  const goToNext = () => {
    for (let i = currentIndex + 1; i < flatLessons.length; i++) {
      const { lesson: l, module: m } = flatLessons[i];
      if (l.isLocked) { message.warning(`"${l.title}" is locked.`); return; }
      onNavigate(l, m); return;
    }
  };

  const needsContent = lesson.lessonMode === 'content' || lesson.lessonMode === 'content_and_simulation';
  const needsSim = lesson.lessonMode === 'simulation' || lesson.lessonMode === 'content_and_simulation';

  if (lesson.isLocked) {
    return (
      <Card style={{ borderRadius: 8 }}>
        <LockedLessonState lesson={lesson} module={module} />
      </Card>
    );
  }

  return (
    <div>
      {/* Lesson header */}
      <Card
        size="small"
        style={{ marginBottom: 12, borderRadius: 8, background: '#F8FAFF' }}
        styles={{ body: { padding: '10px 16px' } }}
      >
        <Space wrap size={6}>
          {modeIcon(lesson.lessonMode, { color: MODE_COLOR[lesson.lessonMode], fontSize: 16 })}
          <Title level={4} style={{ margin: 0 }}>{lesson.title}</Title>
          <Tag color={MODE_TAG[lesson.lessonMode]}>{MODE_LABEL[lesson.lessonMode]}</Tag>
          {lesson.estimatedMinutes != null && (
            <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
              {lesson.estimatedMinutes} min
            </Tag>
          )}
          {lesson.isRequired && <Tag color="orange" style={{ fontSize: 11 }}>Required</Tag>}
          {lesson.completionStatus === 'completed' && (
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 11 }}>Completed</Tag>
          )}
        </Space>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          Module: {module.title}
        </Text>
      </Card>

      {/* Content section */}
      {needsContent && (
        <Card style={{ marginBottom: 12, borderRadius: 8 }}>
          <LessonContentRenderer lesson={lesson} />
        </Card>
      )}

      {/* Simulation section */}
      {needsSim && (
        <div style={{ marginBottom: 12 }}>
          {lesson.lessonMode === 'content_and_simulation' && (
            <Divider style={{ margin: '8px 0' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Interactive Simulation</Text>
            </Divider>
          )}
          <LessonSimulationPlaceholder lesson={lesson} courseId={courseId} />
        </div>
      )}

      {/* Navigation + completion */}
      <Card
        size="small"
        style={{ borderRadius: 8, background: '#FAFAFA' }}
        styles={{ body: { padding: '10px 16px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space size={8}>
              <Button icon={<ArrowLeftOutlined />} disabled={!canGoBack} onClick={goToPrev}>
                Previous
              </Button>
              <Button icon={<ArrowRightOutlined />} disabled={!canGoNext} onClick={goToNext} iconPosition="end">
                Next
              </Button>
            </Space>
          </Col>
          <Col>
            <LessonCompletionButton
              lesson={lesson}
              moduleId={module.id}
              courseId={courseId}
              onComplete={onComplete}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------─

export default function CourseHomePage({ params }: Props) {
  const { id: courseId } = use(params);
  const { user } = useAuth();

  const [journey, setJourney] = useState<CourseJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadJourney = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const data = await getCourseJourney(courseId);
      setJourney(data);
    } catch (err: unknown) {
      const e = err as { status?: number; title?: string; detail?: string };
      setErrorCode(e.status ?? null);
      setError(e.detail ?? e.title ?? 'Failed to load course journey.');
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => { loadJourney(); }, [loadJourney]);

  // Flat ordered list for prev/next navigation
  const flatLessons = useMemo(() => {
    if (!journey) return [];
    return journey.modules.flatMap(mod =>
      mod.lessons.map(l => ({ lesson: l, module: mod })),
    );
  }, [journey]);

  // Auto-select first unlocked incomplete (or just first unlocked) lesson
  useEffect(() => {
    if (!journey || selectedLessonId) return;
    const all = journey.modules.flatMap(m => m.lessons.map(l => ({ l, m })));
    const first = all.find(({ l }) => !l.isLocked && l.completionStatus !== 'completed')
      ?? all.find(({ l }) => !l.isLocked);
    if (first) {
      setSelectedLessonId(first.l.id);
      setSelectedModuleId(first.m.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey]);

  const handleSelectLesson = useCallback((lesson: JourneyLesson, module: JourneyModule) => {
    if (lesson.isLocked) return;
    setSelectedLessonId(lesson.id);
    setSelectedModuleId(module.id);
    setDrawerOpen(false);
  }, []);

  const handleComplete = useCallback(() => { loadJourney(); }, [loadJourney]);

  const selectedModule = journey?.modules.find(m => m.id === selectedModuleId) ?? null;
  const selectedLesson = selectedModule?.lessons.find(l => l.id === selectedLessonId) ?? null;
  const currentIndex = flatLessons.findIndex(e => e.lesson.id === selectedLessonId);

  // -- Render states ------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" description="Loading course…" />
      </div>
    );
  }

  if (errorCode === 403) {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You must be enrolled in this course to access the journey."
        extra={
          <Space>
            <Link href={`/courses/${courseId}`}>
              <Button type="primary">View Course</Button>
            </Link>
            <Link href="/courses">
              <Button>All Courses</Button>
            </Link>
          </Space>
        }
      />
    );
  }

  if (error || !journey) {
    return (
      <Alert
        type="error"
        showIcon
        message={error ?? 'Course journey could not be loaded.'}
        action={<Button size="small" onClick={loadJourney}>Retry</Button>}
        style={{ margin: 24 }}
      />
    );
  }

  const treePanel = (
    <div style={{
      height: 'calc(100vh - 180px)',
      overflowY: 'auto',
      border: '1px solid #F0F0F0',
      borderRadius: 8,
      background: '#fff',
    }}>
      <CourseTreePanel
        modules={journey.modules}
        selectedLessonId={selectedLessonId}
        onSelectLesson={handleSelectLesson}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px' }}>
      {/* <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[
          { title: <Link href="/courses">Courses</Link> },
          { title: <Link href={`/courses/${courseId}`}>{journey.course.title}</Link> },
          { title: 'Journey' },
        ]}
      /> */}

      <CourseProgressHeader
        journey={journey}
        courseId={courseId}
        onOpenTree={() => setDrawerOpen(true)}
      />

      <Row gutter={16} align="top">
        {/* Main content */}
        <Col xs={24} lg={16} xl={17}>
          {!selectedLesson ? (
            <Card style={{ borderRadius: 8, textAlign: 'center', padding: 40 }}>
              <BookOutlined style={{ fontSize: 48, color: '#D1D5DB', marginBottom: 16 }} />
              <div>
                <Text strong style={{ fontSize: 16 }}>Select a lesson to get started</Text>
                <div>
                  <Text type="secondary">
                    Choose a lesson from the course contents panel on the right.
                  </Text>
                </div>
              </div>
            </Card>
          ) : (
            <LessonView
              lesson={selectedLesson}
              module={selectedModule!}
              courseId={courseId}
              flatLessons={flatLessons}
              currentIndex={currentIndex}
              onNavigate={handleSelectLesson}
              onComplete={handleComplete}
            />
          )}
        </Col>

        {/* Right panel — desktop only */}
        <Col xs={0} lg={8} xl={7}>
          {treePanel}
        </Col>
      </Row>

      {/* Drawer — mobile / tablet */}
      <Drawer
        title="Course Contents"
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={320}
        styles={{ body: { padding: 0 } }}
      >
        <CourseTreePanel
          modules={journey.modules}
          selectedLessonId={selectedLessonId}
          onSelectLesson={handleSelectLesson}
        />
      </Drawer>
    </div>
  );
}

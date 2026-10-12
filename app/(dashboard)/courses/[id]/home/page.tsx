'use client';

/**
 * Course Journey Page — SRS §4.8 PRG-01; §4.15 CMS-01 to CMS-04.
 * Route: /courses/:id/home[?activity=:lessonId | ?quiz=:quizId]
 *
 * Layout (desktop): lesson content left (2/3) | course tree right (1/3, sticky).
 * Layout (mobile):  full-width content + Drawer for the course tree.
 *
 * The selected activity is kept in `?activity=` so links from the player, the
 * quiz result and the course page reopen the same activity. `?quiz=` (used by the
 * dashboard, which only knows quiz ids) is resolved to its activity and rewritten.
 *
 * Lesson modes:
 *   content                → content renderer only
 *   simulation             → WebGL viewport card + "Launch Simulation" button
 *   content_and_simulation → content renderer then simulation card
 *
 * "Launch Simulation" navigates to /simulations/:id/play?courseId=...&lessonId=...
 *
 * Preview mode (instructors, TAs and admins — anyone who isn't a student): the same
 * workspace with a Preview label, no completion or attempt actions, and Preview /
 * Edit / Grade actions instead. "Preview Simulation" opens the player directly
 * (/simulations/:id/play), outside the course.
 */

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourseJourney } from '@/lib/journey';
import { markLessonComplete } from '@/lib/modules';
import { getLatestActivityForLesson } from '@/lib/simulation-activity';
import { getMyAttempts } from '@/lib/quiz-attempts';
import type {
  CourseJourney, JourneyModule, JourneyLesson,
  LessonMode, LatestActivitySession, ActivitySessionStatus, QuizAttempt,
} from '@/types';
import {
  Row, Col, Card, Typography, Button, Spin, Alert,
  Skeleton, Space, Drawer, Tooltip, App,
} from 'antd';
import {
  LockOutlined, CheckCircleOutlined, CheckCircleFilled,
  ExperimentOutlined, FileTextOutlined,
  ArrowLeftOutlined, ArrowRightOutlined, PlayCircleOutlined,
  ClockCircleOutlined, ThunderboltOutlined, LinkOutlined,
  DownloadOutlined, FormOutlined, ReloadOutlined,
  EyeOutlined, EditOutlined, BarChartOutlined, CheckSquareOutlined,
} from '@ant-design/icons';
import EmptyState from '@/components/common/EmptyState';
import CourseContentsTree from '@/components/student/CourseContentsTree';
import CourseShellHeader from '@/components/student/CourseShellHeader';
import {
  Chip, DueChip, Fact, LessonTypeChip, dueStatus, formatDate, formatMinutes,
  lockMessage, learningStyles as s, type ChipTone,
} from '@/components/student/studentUi';

// CKEditor is one of the heaviest deps in this app — load it only when a
// rich-text lesson is actually rendered instead of bundling it into every page.
const TextEditor = dynamic(() => import('@/components/editor/TextEditor'), {
  ssr: false,
  loading: () => <Spin size="small" />,
});

const { Text, Paragraph } = Typography;

interface Props { params: Promise<{ id: string }> }

type Entry = { lesson: JourneyLesson; module: JourneyModule };

// -- Helpers ------------------------------------------------------------------

const DIFFICULTY_TONE: Record<string, ChipTone> = {
  beginner: 'success',
  intermediate: 'info',
  advanced: 'error',
};

const SESSION_CHIP: Record<ActivitySessionStatus, { label: string; tone: ChipTone }> = {
  active: { label: 'In progress', tone: 'info' },
  ended: { label: 'Ended', tone: 'neutral' },
  abandoned: { label: 'Not finished', tone: 'warning' },
  expired: { label: 'Expired', tone: 'warning' },
};

const CONTENT_MODES: LessonMode[] = ['content', 'content_and_simulation', 'content_and_quiz', 'content_simulation_and_quiz'];
const SIM_MODES: LessonMode[] = ['simulation', 'content_and_simulation', 'simulation_and_quiz', 'content_simulation_and_quiz'];
const QUIZ_MODE_VALUES: LessonMode[] = ['quiz', 'content_and_quiz', 'simulation_and_quiz', 'content_simulation_and_quiz'];

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

// -- LockedLessonState ----------------------------------------------------------

function LockedLessonState({
  module, recommended, onNavigate,
}: {
  module: JourneyModule;
  recommended: Entry | null;
  onNavigate: (lesson: JourneyLesson, module: JourneyModule) => void;
}) {
  return (
    <section className={`${s.panel} ${s.lockedPanel}`}>
      <span className={s.lockedIcon} aria-hidden><LockOutlined /></span>
      <div style={{ minWidth: 0 }}>
        <p className={s.lockedTitle}>{lockMessage(module.unlockAt)}</p>
        <p className={s.meta} style={{ margin: '4px 0 0' }}>
          You can see this activity in Course Contents, but it can’t be opened yet.
        </p>
        {recommended && (
          <div className={s.actionRow}>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => onNavigate(recommended.lesson, recommended.module)}>
              Go to Up Next
            </Button>
            <span className={s.actionHint}>{recommended.lesson.title}</span>
          </div>
        )}
      </div>
    </section>
  );
}

// -- LessonSimulationPlaceholder ------------------------------------------------

function LessonSimulationPlaceholder({
  lesson, courseId, primary, showMinutes, onSessionLoaded, preview = false,
}: {
  lesson: JourneyLesson;
  courseId: string;
  /** Whether the launch action owns the primary (orange) button in this lesson. */
  primary: boolean;
  /** The lesson header already shows the duration when the lesson has one. */
  showMinutes: boolean;
  onSessionLoaded: (session: LatestActivitySession | null) => void;
  /** Instructor preview: Preview Simulation instead of launch/completion actions. */
  preview?: boolean;
}) {
  const router = useRouter();
  const sim = lesson.simulation;
  const [launching, setLaunching] = useState(false);
  const [lastSession, setLastSession] = useState<LatestActivitySession | null | undefined>(undefined);

  const isWebGL = sim?.launchType === 'webgl';
  const buildReady = !isWebGL || sim?.buildStatus === 'ready';
  const hasSimId = !!lesson.simulationId;
  const isCompleted = lesson.completionStatus === 'completed';

  // Load latest activity session for this lesson (best-effort)
  useEffect(() => {
    if (!hasSimId || !lesson.simulationId) return;
    getLatestActivityForLesson(lesson.id, lesson.simulationId)
      .then((session) => { setLastSession(session); onSessionLoaded(session); })
      .catch(() => { setLastSession(null); onSessionLoaded(null); });
  }, [lesson.id, lesson.simulationId, hasSimId, onSessionLoaded]);

  function handleLaunch() {
    if (!hasSimId) return;
    setLaunching(true);
    // The play page calls startSimulationActivity on mount — no pre-launch needed here
    router.push(`/simulations/${lesson.simulationId}/play?courseId=${courseId}&lessonId=${lesson.id}`);
  }

  const blockedReason = !hasSimId
    ? 'No simulation is linked to this activity.'
    : !buildReady ? 'Simulation not available yet.' : null;
  const minutes = sim?.estimatedMinutes ?? lesson.estimatedMinutes;
  const objectives = (sim?.learningObjectives ?? []).filter(Boolean);
  const simName = sim?.title ?? lesson.title;

  // One action, labelled by where the student is (section 19.6).
  const sessionStatus = lastSession?.status;
  const action = isCompleted
    ? { label: 'Review', icon: <FileTextOutlined />, primary: false, hint: 'Completed. Open the simulation again to review it.' }
    : sessionStatus === 'active'
      ? { label: 'Continue Simulation', icon: <PlayCircleOutlined />, primary, hint: 'Your session is still open.' }
      : sessionStatus === 'ended'
        ? { label: 'Launch Simulation', icon: <ExperimentOutlined />, primary, hint: 'Review session, then mark complete.' }
        : sessionStatus === 'abandoned' || sessionStatus === 'expired'
          ? { label: 'Launch Simulation', icon: <ExperimentOutlined />, primary, hint: 'Your last session didn’t finish. Launch again to complete the activity.' }
          : { label: 'Launch Simulation', icon: <ExperimentOutlined />, primary, hint: null };

  return (
    <section className={`${s.panel} ${s.activityCard} ${s.activityCardSim}`}>
      <div className={s.activityHead}>
        <span className={`${s.activityIcon} ${s.activityIconSim}`} aria-hidden><ExperimentOutlined /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className={s.eyebrow}>Interactive Simulation</span>
          <h3 className={s.activityTitle}>{simName}</h3>
          <div className={s.metaRow} style={{ marginTop: 6 }}>
            {isWebGL && <Chip tone="info" icon={<ThunderboltOutlined />}>WebGL</Chip>}
            {sim?.difficulty && (
              <Chip tone={DIFFICULTY_TONE[sim.difficulty] ?? 'neutral'}>{capitalize(sim.difficulty)}</Chip>
            )}
            {showMinutes && minutes != null && (
              <Chip tone="neutral" icon={<ClockCircleOutlined />}>{formatMinutes(minutes)}</Chip>
            )}
          </div>
        </div>
      </div>

      {/* Browser/WebGL viewport preview — a window frame, not a video player. */}
      <div className={s.simViewport} aria-hidden>
        <div className={s.simChrome}>
          <span className={s.simDots}><span /><span /><span /></span>
          <span className={s.simAddress}>BEDO Interactive 3D Simulation · {simName}</span>
        </div>
        <div
          className={`${s.simScreen} ${sim?.thumbnailUrl ? s.simScreenImage : ''}`}
          style={sim?.thumbnailUrl ? { backgroundImage: `url(${sim.thumbnailUrl})` } : undefined}
        >
          {!sim?.thumbnailUrl && <ExperimentOutlined />}
        </div>
      </div>

      <p className={s.simIntro}>
        {preview
          ? 'Runs in your browser. Preview opens the simulation directly, outside the course.'
          : 'Runs in your browser. Complete the guided activity, then return here to mark it complete.'}
      </p>

      {sim?.description && (
        <Paragraph
          type="secondary"
          style={{ fontSize: 14, marginBottom: 0 }}
          ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
        >
          {sim.description}
        </Paragraph>
      )}

      {/* Only real objectives — never generic filler (section 24.9). */}
      {objectives.length > 0 && (
        <ul className={s.observeList} aria-label="Learning objectives">
          <li style={{ gridColumn: '1 / -1' }}><strong>Learning objectives</strong></li>
          {objectives.map((item) => (
            <li key={item}><CheckCircleFilled style={{ color: 'var(--sl-primary)', marginTop: 3 }} aria-hidden />{item}</li>
          ))}
        </ul>
      )}

      {/* Last session summary */}
      {lastSession && !preview && (
        <div className={`${s.resultPanel} ${s.resultInfo}`}>
          <ClockCircleOutlined style={{ color: 'var(--sl-secondary)' }} />
          <span style={{ fontSize: 13 }}><strong>Last session</strong> · {formatDate(lastSession.startedAt)}</span>
          <span style={{ fontSize: 13 }}>Duration <strong>{lastSession.formattedDuration}</strong></span>
          <Chip tone={SESSION_CHIP[lastSession.status]?.tone ?? 'neutral'}>
            {SESSION_CHIP[lastSession.status]?.label ?? lastSession.status}
          </Chip>
        </div>
      )}

      <div className={s.actionRow}>
        {blockedReason ? (
          <>
            <Button icon={<ExperimentOutlined />} disabled>{preview ? 'Preview Simulation' : 'Launch Simulation'}</Button>
            <span className={s.actionHint}>{blockedReason}</span>
          </>
        ) : preview ? (
          <>
            <Link href={`/simulations/${lesson.simulationId}/play`}>
              <Button type="primary" icon={<EyeOutlined />}>Preview Simulation</Button>
            </Link>
            <Link href={`/simulations/${lesson.simulationId}`}>
              <Button icon={<FileTextOutlined />}>View Details</Button>
            </Link>
            <Link href={`/courses/${courseId}/simulations/${lesson.simulationId}/analytics`}>
              <Button type="text" icon={<BarChartOutlined />}>Simulation Activity</Button>
            </Link>
          </>
        ) : (
          <>
            <Button
              type={action.primary ? 'primary' : 'default'}
              icon={action.icon}
              loading={launching}
              onClick={handleLaunch}
            >
              {action.label}
            </Button>
            <Link href={`/simulations/${lesson.simulationId}`}>
              <Button type="text">View Details</Button>
            </Link>
            {action.hint && <span className={s.actionHint}>{action.hint}</span>}
          </>
        )}
      </div>
    </section>
  );
}

// -- LessonQuizPlaceholder -------------------------------------------------------

function LessonQuizPlaceholder({
  lesson, courseId, preview = false,
}: { lesson: JourneyLesson; courseId: string; preview?: boolean }) {
  const router = useRouter();
  const quiz = lesson.quiz;
  const hasQuizId = !!lesson.quizId;
  const [myAttempts, setMyAttempts] = useState<QuizAttempt[] | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!hasQuizId || !lesson.quizId) return;
    getMyAttempts(courseId, lesson.quizId).then(setMyAttempts).catch(() => setMyAttempts([]));
  }, [courseId, lesson.quizId, hasQuizId]);

  const attemptsUsed = myAttempts?.length ?? 0;
  const inProgress = myAttempts?.find(a => a.status === 'in_progress');
  const lastGraded = myAttempts?.filter(a => a.status === 'graded').slice(-1)[0];
  const isPastAvailability = !!quiz?.availableUntil && new Date(quiz.availableUntil) < new Date();
  const notYetAvailable = !!quiz?.availableFrom && new Date(quiz.availableFrom) > new Date();
  const maxedOut = !!quiz && attemptsUsed >= quiz.maxAttempts;
  const isDraft = quiz?.status !== 'published';

  function handleStart() {
    if (!lesson.quizId) return;
    setStarting(true);
    router.push(`/courses/${courseId}/quizzes/${lesson.quizId}/attempt?lessonId=${lesson.id}`);
  }

  const disabled = !hasQuizId || isDraft || notYetAvailable || (maxedOut && !inProgress) || (isPastAvailability && !inProgress);

  const disabledReason =
    !hasQuizId ? 'No quiz is linked to this activity.'
      : isDraft ? 'This quiz is not published yet.'
        : notYetAvailable ? 'This quiz is not yet available.'
          : (maxedOut && !inProgress) ? 'You have used all your attempts.'
            : (isPastAvailability && !inProgress) ? 'This quiz is no longer available.'
              : undefined;

  // One status badge for the whole quiz (section 19.5).
  const status: { label: string; tone: ChipTone } =
    inProgress ? { label: 'In progress', tone: 'info' }
      : lastGraded?.passed === true ? { label: 'Passed', tone: 'success' }
        : lastGraded?.passed === false ? { label: 'Failed', tone: 'error' }
          : attemptsUsed > 0 ? { label: 'Submitted', tone: 'info' }
            : { label: 'Not started', tone: 'neutral' };

  const passValue = quiz?.passingPercentage != null
    ? `${quiz.passingPercentage}%`
    : quiz?.passingScore != null ? `${quiz.passingScore} pts` : '—';

  // Labels per section 19.6. A passed quiz leads with Review; the start action is secondary.
  const startLabel = inProgress ? 'Resume Quiz' : attemptsUsed > 0 ? 'Try Again' : 'Start Quiz';
  const startPrimary = !(lastGraded?.passed === true && !inProgress);
  const reviewHref = lastGraded && lesson.quizId
    ? `/courses/${courseId}/quizzes/${lesson.quizId}/attempts/${lastGraded.id}/review?lessonId=${lesson.id}`
    : null;
  // Due urgency only matters before the quiz has been attempted, and only when it is soon.
  const showDue = !!quiz?.dueAt && attemptsUsed === 0 && dueStatus(quiz.dueAt).tone !== 'neutral';

  return (
    <section className={`${s.panel} ${s.activityCard} ${s.activityCardQuiz}`}>
      <div className={s.activityHead}>
        <span className={`${s.activityIcon} ${s.activityIconQuiz}`} aria-hidden><FormOutlined /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className={s.eyebrow}>Check Understanding</span>
          <h3 className={s.activityTitle}>{quiz?.title ?? lesson.title}</h3>
          <div className={s.metaRow} style={{ marginTop: 6 }}>
            {preview
              ? (isDraft ? <Chip tone="warning">Draft</Chip> : <Chip tone="success">Published</Chip>)
              : <>
                  <Chip tone={status.tone}>{status.label}</Chip>
                  {showDue && <DueChip dueAt={quiz?.dueAt} />}
                  {isDraft && <Chip tone="warning">Draft</Chip>}
                </>}
          </div>
        </div>
      </div>

      <div className={s.factGrid}>
        <Fact label="Points" value={quiz?.pointsPossible != null ? `${quiz.pointsPossible} pts` : '—'} />
        <Fact label="Pass score" value={passValue} />
        <Fact label="Time limit" value={quiz?.timeLimitSeconds ? `${Math.round(quiz.timeLimitSeconds / 60)} min` : 'No time limit'} />
        <Fact
          label="Attempts"
          value={quiz ? (preview ? `${quiz.maxAttempts} allowed` : `${attemptsUsed} of ${quiz.maxAttempts} used`) : '—'}
        />
        <Fact label="Due" value={quiz?.dueAt ? formatDate(quiz.dueAt, true) : 'No due date'} />
      </div>

      {preview ? (
        <div className={s.actionRow}>
          {lesson.quizId ? (
            <>
              <Link href={`/courses/${courseId}/quizzes/${lesson.quizId}/edit`}>
                <Button icon={<EditOutlined />}>Edit Quiz</Button>
              </Link>
              <Link href={`/courses/${courseId}/quizzes/${lesson.quizId}/grade`}>
                <Button type="text" icon={<CheckSquareOutlined />}>Grade Submissions</Button>
              </Link>
            </>
          ) : (
            <span className={s.actionHint}>No quiz is linked to this activity.</span>
          )}
        </div>
      ) : <>
      {inProgress && (
        <div className={`${s.resultPanel} ${s.resultInfo}`}>
          <ClockCircleOutlined style={{ color: 'var(--sl-secondary)' }} />
          <span style={{ fontSize: 13 }}>
            You have an unfinished attempt. Resume it to keep your saved answers.
          </span>
        </div>
      )}

      {lastGraded && (
        <div
          className={`${s.resultPanel} ${lastGraded.passed === true ? s.resultPass : lastGraded.passed === false ? s.resultFail : ''}`}
        >
          {/* One readable line: "Last attempt: 16 / 20 — Passed" */}
          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
            <span style={{ fontSize: 15, color: 'var(--sl-text-primary)' }}>
              Last attempt:{' '}
              <strong className={s.resultScore} style={{ fontSize: 17 }}>
                {lastGraded.finalScore != null ? `${lastGraded.finalScore} / ${lastGraded.pointsPossible}` : 'Score pending'}
              </strong>
              {lastGraded.passed != null && (
                <strong style={{ color: lastGraded.passed ? 'var(--sl-success-text)' : 'var(--sl-error-text)' }}>
                  {' — '}{lastGraded.passed ? 'Passed' : 'Failed'}
                </strong>
              )}
            </span>
            <span className={s.meta} style={{ display: 'block' }}>
              Attempt {lastGraded.attemptNumber}
              {lastGraded.percentage != null && ` · ${lastGraded.percentage}%`}
              {lastGraded.submittedAt && ` · Submitted ${formatDate(lastGraded.submittedAt, true)}`}
            </span>
          </div>
        </div>
      )}

      <div className={s.actionRow}>
        {reviewHref && !startPrimary && (
          <Link href={reviewHref}><Button icon={<FileTextOutlined />}>Review</Button></Link>
        )}
        <Tooltip title={disabledReason}>
          <Button
            type={startPrimary ? 'primary' : 'default'}
            icon={attemptsUsed > 0 && !inProgress ? <ReloadOutlined /> : <PlayCircleOutlined />}
            loading={starting}
            disabled={disabled}
            onClick={handleStart}
          >
            {startLabel}
          </Button>
        </Tooltip>
        {reviewHref && startPrimary && (
          <Link href={reviewHref}><Button icon={<FileTextOutlined />}>Review</Button></Link>
        )}
        {disabled && disabledReason && <span className={s.actionHint}>{disabledReason}</span>}
      </div>
      </>}
    </section>
  );
}

// -- LessonContentRenderer ------------------------------------------------------

function LessonContentRenderer({ lesson }: { lesson: JourneyLesson }) {
  const { contentType, content } = lesson;

  if (!contentType) return null;

  if (contentType === 'rich_text') {
    const body = (content.body as string) ?? '';
    return body ? (
      <TextEditor body={body} readOnly />
    ) : (
      <Text type="secondary">No content available for this activity.</Text>
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
      <video controls className={s.mediaVideo}>
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
            style={{ width: '100%', height: 620, border: '1px solid var(--sl-border)', borderRadius: 8 }}
          />
        </div>
      );
    }

    // Video file stored as file content type — play inline
    if (mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)$/i.test(url)) {
      return (
        <video controls className={s.mediaVideo}>
          <source src={url} type={mimeType || 'video/mp4'} />
          <Text type="secondary">Your browser does not support video playback.</Text>
        </video>
      );
    }

    // Other file types — download link
    return (
      <Card size="small" style={{ background: 'var(--sl-surface-muted)' }}>
        <Space>
          <DownloadOutlined style={{ fontSize: 20, color: 'var(--sl-secondary)' }} />
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
      <Card size="small" style={{ background: 'var(--sl-surface-muted)' }}>
        <Space>
          <LinkOutlined style={{ fontSize: 20, color: 'var(--sl-secondary)' }} />
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
  lesson, moduleId, courseId, onComplete, primary,
}: {
  lesson: JourneyLesson;
  moduleId: string;
  courseId: string;
  onComplete: () => void;
  /** Primary only when nothing else in the lesson owns the main action. */
  primary: boolean;
}) {
  const { message } = App.useApp();
  const [busy, setBusy] = useState(false);
  const needsQuiz = QUIZ_MODE_VALUES.includes(lesson.lessonMode);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[] | null>(null);

  useEffect(() => {
    if (!needsQuiz || !lesson.quizId) return;
    getMyAttempts(courseId, lesson.quizId).then(setQuizAttempts).catch(() => setQuizAttempts([]));
  }, [needsQuiz, courseId, lesson.quizId]);

  const isCompleted = lesson.completionStatus === 'completed';

  if (isCompleted) {
    return (
      <span className={s.completedMark}>
        <CheckCircleFilled aria-hidden /> Completed
      </span>
    );
  }

  const quizSubmitted = !needsQuiz || (quizAttempts?.some(a => a.status !== 'in_progress') ?? false);

  const handleComplete = async () => {
    setBusy(true);
    try {
      await markLessonComplete(courseId, moduleId, lesson.id);
      message.success('Activity marked as complete.');
      onComplete();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to mark activity as complete.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tooltip title={!quizSubmitted ? 'Submit the quiz before marking this activity complete.' : undefined}>
      <Button
        type={primary ? 'primary' : 'default'}
        icon={<CheckCircleOutlined />}
        loading={busy}
        disabled={needsQuiz && (quizAttempts === null || !quizSubmitted)}
        onClick={handleComplete}
      >
        Mark as Complete
      </Button>
    </Tooltip>
  );
}

// -- LessonView (renders a single lesson with prev/next controls) --------------

function LessonView({
  lesson, module, courseId, flatLessons, currentIndex, recommended,
  onNavigate, onComplete, preview = false,
}: {
  lesson: JourneyLesson;
  module: JourneyModule;
  courseId: string;
  flatLessons: Entry[];
  currentIndex: number;
  recommended: Entry | null;
  onNavigate: (lesson: JourneyLesson, module: JourneyModule) => void;
  onComplete: () => void;
  /** Instructor preview: show every activity, no completion actions. */
  preview?: boolean;
}) {
  // The simulation card reports its latest session so the page can decide which
  // button is primary once a session has ended.
  const [simSession, setSimSession] = useState<LatestActivitySession | null>(null);

  const prev = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  const needsContent = CONTENT_MODES.includes(lesson.lessonMode);
  const needsSim = SIM_MODES.includes(lesson.lessonMode);
  const needsQuiz = QUIZ_MODE_VALUES.includes(lesson.lessonMode);
  const isCompleted = lesson.completionStatus === 'completed';

  // Session ended but not yet marked complete: completion becomes the main action.
  const simAwaitingCompletion = needsSim && !needsQuiz && !isCompleted && simSession?.status === 'ended';

  const positionInModule = module.lessons.findIndex(l => l.id === lesson.id) + 1;
  // Point at the real next step when it isn't simply the next item in order.
  const showUpNext = !preview && (isCompleted || lesson.isLocked) && !!recommended && recommended.lesson.id !== next?.lesson.id;
  // Instructors preview locked activities too; students see the locked state.
  const showLocked = lesson.isLocked && !preview;

  return (
    <div>
      {/* Lesson header — at most three badges (section 10.4) */}
      <section className={`${s.panel} ${s.lessonHeader}`}>
        <span className={s.eyebrow}>
          {module.title} · Activity {positionInModule} of {module.lessons.length}
        </span>
        <h2 className={s.lessonHeaderTitle}>{lesson.title}</h2>
        <div className={s.metaRow}>
          <LessonTypeChip mode={lesson.lessonMode} />
          {lesson.isLocked
            ? <Chip tone="neutral" icon={<LockOutlined />}>{lockMessage(module.unlockAt, true)}</Chip>
            : isCompleted && !preview
              ? <Chip tone="success" icon={<CheckCircleFilled />}>Completed</Chip>
              : lesson.isRequired && <Chip tone="neutral">Required</Chip>}
          {lesson.estimatedMinutes != null && (
            <Chip tone="neutral" icon={<ClockCircleOutlined />}>{formatMinutes(lesson.estimatedMinutes)}</Chip>
          )}
        </div>
      </section>

      {preview && lesson.isLocked && (
        <div className={`${s.panel} ${s.previewNote}`}>
          <LockOutlined aria-hidden />
          <span>Students see this activity as locked: {lockMessage(module.unlockAt)}</span>
        </div>
      )}

      {showLocked ? (
        <LockedLessonState module={module} recommended={recommended} onNavigate={onNavigate} />
      ) : (
        <>
          {/* Content section */}
          {needsContent && (
            <section className={`${s.panel} ${s.contentCard}`}>
              <LessonContentRenderer lesson={lesson} />
            </section>
          )}

          {/* Simulation section — the quiz, when present, owns the primary action. */}
          {needsSim && (
            <LessonSimulationPlaceholder
              lesson={lesson}
              courseId={courseId}
              primary={!needsQuiz && !simAwaitingCompletion}
              showMinutes={lesson.estimatedMinutes == null}
              onSessionLoaded={setSimSession}
              preview={preview}
            />
          )}

          {/* Quiz section */}
          {needsQuiz && (
            <>
              {lesson.lessonMode !== 'quiz' && <div className={s.blockLabel}>Check Understanding</div>}
              <LessonQuizPlaceholder lesson={lesson} courseId={courseId} preview={preview} />
            </>
          )}
        </>
      )}

      {showUpNext && recommended && !showLocked && (
        <div className={`${s.panel} ${s.upNextBar}`}>
          <span className={s.upNextBarLabel}>Up next</span>
          <span className={s.upNextBarTitle}>{recommended.lesson.title}</span>
          <Button size="small" icon={<ArrowRightOutlined />} iconPlacement="end" onClick={() => onNavigate(recommended.lesson, recommended.module)}>
            Open
          </Button>
        </div>
      )}

      {/* Navigation + completion */}
      <div className={`${s.panel} ${s.lessonNav}`}>
        <Space size={8} wrap className={s.lessonNavButtons}>
          <Button icon={<ArrowLeftOutlined />} disabled={!prev} onClick={() => prev && onNavigate(prev.lesson, prev.module)}>
            Previous
          </Button>
          <Button
            icon={<ArrowRightOutlined />}
            iconPlacement="end"
            disabled={!next}
            onClick={() => next && onNavigate(next.lesson, next.module)}
            title={next ? `Next: ${next.lesson.title}` : undefined}
          >
            {next
              ? <span className={s.nextLabel}>Next: {next.lesson.title}</span>
              : 'Next Activity'}
          </Button>
        </Space>
        {preview ? (
          <Link href={`/courses/${courseId}/edit?tab=builder&lesson=${lesson.id}`}>
            <Button icon={<EditOutlined />}>Edit Activity</Button>
          </Link>
        ) : !lesson.isLocked && (
          <LessonCompletionButton
            lesson={lesson}
            moduleId={module.id}
            courseId={courseId}
            onComplete={onComplete}
            primary={(!needsSim && !needsQuiz) || simAwaitingCompletion}
          />
        )}
      </div>
    </div>
  );
}

// -- Loading state ----------------------------------------------------------------

function WorkspaceSkeleton() {
  return (
    <div className={s.page} style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px' }} aria-busy="true" aria-label="Loading course">
      <section className={`${s.panel} ${s.homeHeader}`}>
        <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1, width: '60%' }} />
      </section>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15} xl={16}>
          <section className={s.panel} style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 6 }} /></section>
        </Col>
        <Col xs={0} lg={9} xl={8}>
          <section className={s.panel} style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 8 }} /></section>
        </Col>
      </Row>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------

export default function CourseHomePage({ params }: Props) {
  const { id: courseId } = use(params);
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Anyone who isn't a student views the workspace as a preview.
  const isPreview = !!user && !hasRole('student') && (
    hasRole('instructor') || hasRole('teaching_assistant')
    || hasRole('super_admin') || hasRole('institution_admin') || hasRole('dept_manager')
  );
  const requestedActivity = searchParams.get('activity');
  const requestedQuiz = searchParams.get('quiz');

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
      setError(e.detail ?? e.title ?? 'Failed to load this course.');
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => { loadJourney(); }, [loadJourney]);

  // Flat ordered list for prev/next navigation
  const flatLessons = useMemo<Entry[]>(() => {
    if (!journey) return [];
    return journey.modules.flatMap(mod => mod.lessons.map(l => ({ lesson: l, module: mod })));
  }, [journey]);

  /** Keep the selected activity in the URL so it survives refreshes and return trips. */
  const writeActivityParam = useCallback((lessonId: string) => {
    router.replace(`/courses/${courseId}/home?activity=${encodeURIComponent(lessonId)}`, { scroll: false });
  }, [router, courseId]);

  // Select from ?activity= (or ?quiz=); otherwise keep the current selection, or fall
  // back to the first unlocked incomplete (or just first unlocked) activity.
  useEffect(() => {
    if (!journey) return;
    const requested = flatLessons.find(e => e.lesson.id === requestedActivity)
      ?? (requestedQuiz ? flatLessons.find(e => e.lesson.quizId === requestedQuiz) : undefined);
    const fallback = flatLessons.find(e => !e.lesson.isLocked && e.lesson.completionStatus !== 'completed')
      ?? flatLessons.find(e => !e.lesson.isLocked);
    const target = requested
      ?? flatLessons.find(e => e.lesson.id === selectedLessonId)
      ?? fallback;
    if (!target) return;
    if (target.lesson.id !== selectedLessonId) {
      setSelectedLessonId(target.lesson.id);
      setSelectedModuleId(target.module.id);
    }
    // Normalise the URL: invalid ids, ?quiz= and missing params all become ?activity=.
    if (requestedActivity !== target.lesson.id || requestedQuiz) writeActivityParam(target.lesson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey, flatLessons, requestedActivity, requestedQuiz]);

  const handleSelectLesson = useCallback((lesson: JourneyLesson, module: JourneyModule) => {
    setSelectedLessonId(lesson.id);
    setSelectedModuleId(module.id);
    setDrawerOpen(false);
    writeActivityParam(lesson.id);
  }, [writeActivityParam]);

  const handleComplete = useCallback(() => { loadJourney(); }, [loadJourney]);

  const selectedModule = journey?.modules.find(m => m.id === selectedModuleId) ?? null;
  const selectedLesson = selectedModule?.lessons.find(l => l.id === selectedLessonId) ?? null;
  const currentIndex = flatLessons.findIndex(e => e.lesson.id === selectedLessonId);
  // Recommended next step: the first open, unfinished activity other than the one in view.
  const recommended = flatLessons.find(e =>
    !e.lesson.isLocked && e.lesson.completionStatus !== 'completed' && e.lesson.id !== selectedLessonId) ?? null;

  // -- Render states ------------------------------------------------------------

  if (loading && !journey) return <WorkspaceSkeleton />;

  if (errorCode === 403) {
    return (
      <div className={s.page} style={{ maxWidth: 720, margin: '0 auto' }}>
        <section className={s.panel}>
          <EmptyState
            description="Enroll in this course to open its activities."
            extra={
              <Space>
                <Link href={`/courses/${courseId}`}><Button type="primary">View Course Details</Button></Link>
                <Link href="/courses"><Button>All Courses</Button></Link>
              </Space>
            }
          />
        </section>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <Alert
        type="error"
        showIcon
        message="Couldn’t load this course"
        description={error ?? 'Course journey could not be loaded.'}
        action={<Button size="small" onClick={loadJourney}>Retry</Button>}
        style={{ margin: 24 }}
      />
    );
  }

  return (
    <div className={s.page} style={{ maxWidth: 1200, margin: '0 auto', padding: '0 4px' }}>
      {/* Same course header and navigation as the course page, with Contents active */}
      <CourseShellHeader
        courseId={courseId}
        title={journey.course.title}
        scope={[journey.course.departmentName, journey.course.semesterTermName, journey.course.academicYearName]}
        progress={journey.progress}
        currentModule={selectedModule ? <>Module: <strong>{selectedModule.title}</strong></> : null}
        active="contents"
        preview={isPreview}
        onOpenContents={() => setDrawerOpen(true)}
      />

      <Row gutter={[16, 16]} align="top">
        {/* Main content */}
        <Col xs={24} lg={15} xl={16}>
          {!selectedLesson ? (
            <section className={s.panel}>
              <EmptyState description="Choose an activity from Course Contents to get started." />
            </section>
          ) : (
            <LessonView
              key={selectedLesson.id}
              lesson={selectedLesson}
              module={selectedModule!}
              courseId={courseId}
              flatLessons={flatLessons}
              currentIndex={currentIndex}
              recommended={recommended}
              onNavigate={handleSelectLesson}
              onComplete={handleComplete}
              preview={isPreview}
            />
          )}
        </Col>

        {/* Right panel — desktop only (sticky) */}
        <Col xs={0} lg={9} xl={8}>
          <aside className={`${s.panel} ${s.tree}`}>
            <CourseContentsTree
              modules={journey.modules}
              currentLessonId={selectedLessonId}
              upNextId={isPreview ? null : recommended?.lesson.id ?? null}
              onSelectLesson={handleSelectLesson}
              preview={isPreview}
            />
          </aside>
        </Col>
      </Row>

      {/* Drawer — mobile / tablet */}
      <Drawer
        title="Course Contents"
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={340}
        styles={{ body: { padding: 0 } }}
        rootClassName={s.page}
      >
        <CourseContentsTree
          modules={journey.modules}
          currentLessonId={selectedLessonId}
          upNextId={isPreview ? null : recommended?.lesson.id ?? null}
          onSelectLesson={handleSelectLesson}
          showTitle={false}
          preview={isPreview}
        />
      </Drawer>
    </div>
  );
}

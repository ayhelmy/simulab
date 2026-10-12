'use client';

/**
 * Course page — route /courses/:id[?view=simulations|grades|resources].
 * Enrolled students: course header + course navigation, the selected view on the
 * left (Home by default) and the Course Contents tree on the right.
 * Managers: management workspace. Everyone else: course summary with enrollment.
 */

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getCourse, publishCourse, archiveCourse, restoreCourse, cloneCourse, deleteCourse,
  enrollInCourse, unenroll, getMyEnrollment,
} from '@/lib/courses';
import { getCourseTree } from '@/lib/modules';
import { getCourseJourney } from '@/lib/journey';
import type { Course, Enrollment, CourseModule, CourseJourney, JourneyLesson, LessonMode } from '@/types';
import {
  Alert, Button, Input,
  Popconfirm, App, Row, Col, Drawer,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, RocketOutlined,
  InboxOutlined, CopyOutlined, DeleteOutlined, EditOutlined,
  LockOutlined, PlayCircleOutlined, CheckCircleFilled, PlayCircleFilled,
  ReloadOutlined, BarChartOutlined, RightOutlined, ExperimentOutlined,
  ThunderboltOutlined, UnorderedListOutlined, FlagOutlined, FormOutlined, FileTextOutlined,
  SettingOutlined, TeamOutlined, AppstoreOutlined, EyeOutlined, CheckSquareOutlined,
} from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';
import EmptyState from '@/components/common/EmptyState';
import CourseContentsTree from '@/components/student/CourseContentsTree';
import CourseShellHeader, { COURSE_VIEWS, courseTabHref, type CourseTab } from '@/components/student/CourseShellHeader';
import LoadingState from '@/components/common/LoadingState';
import {
  Chip, LessonTypeChip, activityHref as workspaceHref, formatDate, formatMinutes,
  learningState, lessonTypeIcon, lockMessage,
  learningStyles as s,
} from '@/components/student/studentUi';

const ENROLL_TYPE_LABEL: Record<string, string> = {
  open:     'Open Enrollment',
  approval: 'Requires Approval',
  code:     'Enrollment Code Required',
  admin:    'Admin-Managed Enrollment',
};

interface Props { params: Promise<{ id: string }> }

interface OutlineLesson {
  id: string;
  title: string;
  mode: LessonMode;
  isRequired: boolean;
  minutes?: number | null;
  isPublished: boolean;
  simulationId?: string | null;
  quizId?: string | null;
  /** Simulation metadata — only available from the student journey. */
  simTitle?: string | null;
  simDescription?: string | null;
  simThumb?: string | null;
  webgl?: boolean;
  state: 'completed' | 'current' | 'locked' | 'available';
}

interface OutlineModule {
  id: string;
  title: string;
  description?: string | null;
  isPublished: boolean;
  locked: boolean;
  lockReason: string | null;
  unlockAt?: string | null;
  /** True when completion data is known (student journey). */
  tracked: boolean;
  lessons: OutlineLesson[];
}

const LESSON_STATE_ICON: Record<OutlineLesson['state'], (mode: LessonMode) => React.ReactNode> = {
  completed: () => <CheckCircleFilled style={{ color: 'var(--sl-success)' }} />,
  current: () => <PlayCircleFilled style={{ color: 'var(--sl-primary)' }} />,
  locked: () => <LockOutlined style={{ color: 'var(--sl-text-muted)' }} />,
  available: (mode) => lessonTypeIcon(mode, { color: 'var(--sl-text-secondary)' }),
};

const isSimulation = (mode: LessonMode) => mode.includes('simulation');
const isQuiz = (mode: LessonMode) => mode.includes('quiz');

export default function CourseDetailPage({ params }: Props) {
  const { id } = use(params);
  const { user, hasRole } = useAuth();
  const router = useRouter();
  // Course views for enrolled students (Simulations · Grades · Resources); absent = Home.
  const view = useSearchParams().get('view');
  const { message } = App.useApp();

  const [course, setCourse]         = useState<Course | null>(null);
  const [modules, setModules]       = useState<CourseModule[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [journey, setJourney]       = useState<CourseJourney | null>(null);
  const [openModules, setOpenModules] = useState<Set<string> | null>(null);
  const [treeOpen, setTreeOpen]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [pageError, setPageError]   = useState<string | null>(null);

  const [enrollCode, setEnrollCode] = useState('');
  const [enrolling, setEnrolling]   = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);

  const isInstitutionAdmin = hasRole('institution_admin');
  const isDeptManager = hasRole('dept_manager');
  const isAdmin      = hasRole('super_admin') || isInstitutionAdmin;
  const isOwnCourse  = course?.instructorId === user?.id;
  const canManage    = isAdmin || isOwnCourse;
  const canDelete    = isAdmin;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        const [c, e, mods] = await Promise.all([
          getCourse(id),
          getMyEnrollment(id),
          getCourseTree(id).catch(() => []),
        ]);
        setCourse(c);
        setEnrollment(e);
        setModules(mods);
        // Enrolled students: progress + per-lesson completion for the header and
        // module list. Best-effort — the page falls back to the plain module tree.
        if (e?.status === 'active') {
          getCourseJourney(id).then(setJourney).catch(() => setJourney(null));
        }
      } catch (err: unknown) {
        const e = err as { detail?: string; title?: string };
        setPageError(e?.detail ?? e?.title ?? 'Failed to load course.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // One outline shape for both sources: the student journey (with completion and
  // lock state) when enrolled, otherwise the plain module tree.
  const outline = useMemo<OutlineModule[]>(() => {
    if (journey) {
      const current = journey.modules.flatMap((m) => m.lessons)
        .find((l) => !l.isLocked && l.completionStatus !== 'completed')?.id;
      return journey.modules.map((m) => ({
        id: m.id, title: m.title, description: m.description, isPublished: m.isPublished,
        locked: m.isLocked, lockReason: m.isLocked ? lockMessage(m.unlockAt) : null, unlockAt: m.unlockAt,
        tracked: true,
        lessons: m.lessons.map((l) => ({
          id: l.id, title: l.title, mode: l.lessonMode, isRequired: l.isRequired, minutes: l.estimatedMinutes,
          isPublished: l.isPublished, simulationId: l.simulationId, quizId: l.quizId,
          simTitle: l.simulation?.title, simDescription: l.simulation?.description, simThumb: l.simulation?.thumbnailUrl,
          webgl: l.simulation?.launchType === 'webgl',
          state: l.completionStatus === 'completed' ? 'completed' : l.isLocked ? 'locked' : l.id === current ? 'current' : 'available',
        })),
      }));
    }
    return modules.map((m) => {
      const locked = !!m.unlockAt && new Date(m.unlockAt) > new Date();
      return {
        id: m.id, title: m.title, description: m.description, isPublished: m.isPublished,
        locked, lockReason: locked ? lockMessage(m.unlockAt) : null, unlockAt: m.unlockAt, tracked: false,
        lessons: (m.lessons ?? []).map((l) => ({
          id: l.id, title: l.title, mode: l.lessonMode, isRequired: l.isRequired, minutes: l.estimatedMinutes,
          isPublished: l.isPublished, simulationId: l.simulationId, quizId: l.quizId,
          state: locked ? 'locked' : 'available',
        })),
      };
    });
  }, [journey, modules]);

  async function handleEnroll() {
    if (!course) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      const data = course.enrollmentType === 'code' ? { enrollmentCode: enrollCode } : {};
      const e = await enrollInCourse(id, data);
      setEnrollment(e);
      if (e.status === 'active') router.push(`/courses/${id}/home`);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setEnrollError(e?.detail ?? e?.title ?? 'Enrollment failed.');
    } finally { setEnrolling(false); }
  }

  async function handleUnenroll() {
    if (!user) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      await unenroll(id, user.id);
      setEnrollment(null);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setEnrollError(e?.detail ?? e?.title ?? 'Failed to withdraw.');
    } finally { setEnrolling(false); }
  }

  async function handlePublish() {
    setActionBusy(true);
    try {
      const updated = await publishCourse(id);
      setCourse(updated);
      message.success('Course published. Students can now enroll.');
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

  async function handleRestore() {
    setActionBusy(true);
    try {
      const updated = await restoreCourse(id);
      setCourse(updated);
      message.success('Course restored to draft.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Restore failed.');
    } finally { setActionBusy(false); }
  }

  async function handleClone() {
    setActionBusy(true);
    try {
      const cloned = await cloneCourse(id);
      message.success(`Cloned as "${cloned.title}". Redirecting…`);
      setTimeout(() => router.push(`/courses/${cloned.id}/edit`), 1200);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Clone failed.');
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
    return <div className={s.page}><section className={s.panel} style={{ padding: 16 }}><LoadingState type="skeleton" rows={6} /></section></div>;
  }

  if (pageError) return <Alert type="error" title={pageError} showIcon />;
  if (!course) return null;

  const isEnrollable = course.status === 'published' && !isOwnCourse;

  // -- Derived display state ---------------------------------------------------
  const isStudentEnrolled = enrollment?.status === 'active';
  const tracked = !!journey;
  const progress = journey?.progress ?? null;
  const progressState = progress ? learningState(progress.percentage) : null;
  const primaryLabel = progressState === 'completed' ? 'Review Course' : progressState === 'not_started' ? 'Start Course' : 'Continue Course';

  const entries = outline.flatMap((m) => m.lessons.map((l) => ({ l, m })));
  const activityCount = entries.length;
  const totalMinutes = entries.reduce((k, { l }) => k + (l.minutes ?? 0), 0);
  const done = (list: typeof entries) => list.filter(({ l }) => l.state === 'completed').length;
  const current = entries.find(({ l }) => l.state === 'current');
  const simEntries = entries.filter(({ l }) => isSimulation(l.mode));
  // The simulation to feature: the next one still to do, else any open one, else the first.
  const mainSim = simEntries.find(({ l }) => l.state === 'current' || l.state === 'available')
    ?? simEntries.find(({ l }) => l.state !== 'locked')
    ?? simEntries[0];

  // Every student activity link opens the course workspace with that activity
  // selected — the course page never launches the player directly.
  const activityHref = (lessonId: string) => workspaceHref(id, lessonId);
  const continueHref = workspaceHref(id, current?.l.id);

  // Enrolled students: only the module holding the next activity starts open.
  // Untracked views keep the previous default (every open, published module).
  const isOpen = (m: OutlineModule) =>
    openModules ? openModules.has(m.id)
      : m.tracked ? m.id === current?.m.id
        : !m.locked && m.isPublished;
  const toggleModule = (m: OutlineModule) => {
    const next = new Set(outline.filter(isOpen).map((x) => x.id));
    if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
    setOpenModules(next);
  };

  const courseEnded = !!course.endDate && new Date(course.endDate) < new Date();
  // "Completed" comes from the student's progress, never from the calendar.
  const courseCompleted = !!progress && progress.percentage >= 100;
  const enrolledChip = courseCompleted
    ? { label: 'Completed', tone: 'success' as const, icon: <CheckCircleOutlined /> }
    : courseEnded
      ? { label: 'Ended', tone: 'neutral' as const, icon: <ClockCircleOutlined /> }
      : { label: 'Enrolled', tone: 'success' as const, icon: <CheckCircleOutlined /> };

  // What You Will Learn — module topics plus the simulations the course uses.
  const concepts = [
    ...outline.map((m) => ({ key: `m-${m.id}`, label: m.title, sim: false })),
    ...simEntries.map(({ l }) => ({ key: `s-${l.id}`, label: l.simTitle ?? l.title, sim: true })),
  ].filter((c, i, all) => all.findIndex((x) => x.label === c.label) === i);

  const requirements = [
    { key: 'req', icon: <FlagOutlined />, title: 'Complete required activities', unit: 'activities', list: entries.filter(({ l }) => l.isRequired) },
    { key: 'sim', icon: <ExperimentOutlined />, title: 'Launch required simulations', unit: 'simulations', list: simEntries.filter(({ l }) => l.isRequired) },
    { key: 'quiz', icon: <FormOutlined />, title: 'Pass required quizzes', unit: 'quizzes', list: entries.filter(({ l }) => isQuiz(l.mode) && l.isRequired) },
  ].filter((r) => r.list.length > 0);

  function rowAction(l: OutlineLesson, m: OutlineModule) {
    if (!tracked) return null;
    if (l.state === 'locked') return <Chip tone="neutral" icon={<LockOutlined />}>{lockMessage(m.unlockAt, true)}</Chip>;
    if (l.state === 'completed') {
      return (
        <>
          <Chip tone="success">Completed</Chip>
          <Link href={activityHref(l.id)}><Button size="small" type="text">Review</Button></Link>
        </>
      );
    }
    // Rows only open the activity in the workspace; launching happens there.
    return (
      <Link href={activityHref(l.id)}>
        <Button size="small" icon={l.state === 'current' ? <PlayCircleOutlined /> : undefined}>
          {l.state === 'current' ? 'Continue' : 'Open'}
        </Button>
      </Link>
    );
  }

  /**
   * Access + progress, shown inside the hero (replaces the old "Your Access" card).
   * Same states and handlers as before: enrolled · pending · instructor · not
   * enrollable · enroll (open / approval / code).
   */
  function renderAccess() {
    if (!course) return null;
    const type = course.enrollmentType;

    if (enrollment?.status === 'active') {
      return (
        <div className={s.heroFooter}>
          {/* One main action into the workspace. Progress is in the rail; Drop Course is in Course Details. */}
          <div className={s.heroActions}>
            <Link href={continueHref}>
              <Button type="primary" size="large" icon={<PlayCircleOutlined />}>
                {progress ? primaryLabel : 'Continue Course'}
              </Button>
            </Link>
            {activityCount > 0 && (
              <Button
                size="large"
                icon={<UnorderedListOutlined />}
                onClick={() => document.getElementById('course-contents')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                View Course Contents
              </Button>
            )}
          </div>
          {enrollError && <Alert type="error" title={enrollError} showIcon style={{ flexBasis: '100%' }} />}
        </div>
      );
    }

    if (enrollment?.status === 'pending') {
      return (
        <div className={s.heroFooter}>
          <span className={s.heroNote}>
            <ClockCircleOutlined style={{ color: 'var(--sl-warning-text)' }} /> Your enrollment request is awaiting approval.
          </span>
          <div className={s.heroActions}>
            <Button size="large" loading={enrolling} onClick={handleUnenroll}>Cancel Request</Button>
          </div>
        </div>
      );
    }

    // Staff views and courses that can't be joined: a short note only.
    if (isInstitutionAdmin || isDeptManager || isOwnCourse || !isEnrollable) {
      const note = isOwnCourse
        ? 'You manage this course.'
        : isInstitutionAdmin || isDeptManager
          ? null
          : type === 'admin' && !isAdmin
            ? 'Contact your administrator to enroll.'
            : 'This course is not available for enrollment.';
      return note ? <div className={s.heroFooter}><span className={s.heroNote}>{note}</span></div> : null;
    }

    const label = type === 'approval' ? 'Request to Enroll' : type === 'code' ? 'Enroll with Code' : 'Enroll Now';

    return (
      <div className={s.heroFooter}>
        <span className={s.heroNote}>
          {type === 'approval'
            ? 'Your request will be reviewed before you can start.'
            : 'Enroll to launch the simulations and track your progress.'}
        </span>
        <div className={s.heroActions}>
          {type === 'code' && (
            <Input
              size="large"
              placeholder="Enter enrollment code"
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value)}
              style={{ width: 220 }}
            />
          )}
          <Button
            type="primary"
            size="large"
            loading={enrolling}
            disabled={type === 'code' && !enrollCode.trim()}
            onClick={handleEnroll}
          >
            {label}
          </Button>
        </div>
        {enrollError && <Alert type="error" title={enrollError} showIcon style={{ flexBasis: '100%' }} />}
      </div>
    );
  }

  const sim = mainSim?.l;
  const simName = sim ? (sim.simTitle ?? sim.title) : null;

  // ── Manager view (instructor who owns the course, or admin) ─────────────────
  // A management workspace: no enrollment language, main actions at the top,
  // course-status actions in a compact right rail.
  if (canManage) {
    const editContentsHref = `/courses/${id}/edit?tab=builder`;
    const previewHref = `/courses/${id}/home`;
    const simPreviewHref = sim?.simulationId ? `/simulations/${sim.simulationId}/play` : null;
    const simCount = simEntries.length;

    return (
      <div className={`${s.page} ${s.overviewGrid} ${s.overviewSplit}`}>
        {/* Header + primary actions */}
        <section className={`${s.panel} ${s.courseHero} ${s.areaHero}`}>
          <div
            className={s.courseHeroThumb}
            style={course.thumbnailUrl ? { backgroundImage: `url(${course.thumbnailUrl})` } : undefined}
            aria-hidden
          >
            {!course.thumbnailUrl && <ExperimentOutlined />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className={s.metaRow} style={{ marginBottom: 8 }}>
              <StatusTag status={course.status} />
              {course.code && <Chip tone="info">{course.code}</Chip>}
              <Chip tone="neutral" icon={<SettingOutlined />}>
                {isOwnCourse ? 'You manage this course' : 'Admin access'}
              </Chip>
            </div>
            <span className={s.eyebrow}>Interactive Simulation Course</span>
            <h1 className={s.pathHeroTitle}>{course.title}</h1>
            <div className={s.metaRow}>
              {[course.departmentName, 'Interactive 3D Simulation', course.semesterTermName].filter(Boolean).map((part, i) => (
                <span key={i} className={`${s.meta} ${i > 0 ? s.dot : ''}`}>{part}</span>
              ))}
            </div>
            <div className={s.managerFacts}>
              <span><TeamOutlined /> <strong>{course.enrolledCount ?? '—'}</strong> enrolled students</span>
              <span><AppstoreOutlined /> <strong>{outline.length}</strong> modules</span>
              <span><UnorderedListOutlined /> <strong>{activityCount}</strong> activities</span>
              <span><ExperimentOutlined /> <strong>{simCount}</strong> simulations</span>
            </div>

            <div className={`${s.heroFooter} ${s.managerActions}`}>
              <Link href={`/courses/${id}/edit`}>
                <Button type="primary" icon={<EditOutlined />}>Edit Course</Button>
              </Link>
              <Link href={previewHref}><Button icon={<EyeOutlined />}>Preview Course</Button></Link>
              <Link href={`/courses/${id}/grade`}><Button icon={<CheckSquareOutlined />}>Grade Submissions</Button></Link>
              {/* No course roster page exists; the gradebook lists each course's students. */}
              <Link href="/gradebook"><Button icon={<TeamOutlined />}>View Students</Button></Link>
            </div>
          </div>
        </section>

        {/* Right rail — course management */}
        <aside className={`${s.rail} ${s.areaRail}`} aria-label="Course management">
          <section className={`${s.panel} ${s.railCard}`} aria-labelledby="mgmt-title">
            <h3 className={s.railTitle} id="mgmt-title">Course Management</h3>
            <dl className={s.railList} style={{ marginTop: 0, marginBottom: 12 }}>
              <FragmentRow label="Status" value={<StatusTag status={course.status} />} />
              {course.publishedAt && <FragmentRow label="Published" value={formatDate(course.publishedAt)} />}
              <FragmentRow label="Passing grade" value={`${course.passingGrade}%`} />
            </dl>
            <div className={s.railActions}>
              <Link href={`/courses/${id}/activity`}>
                <Button block icon={<BarChartOutlined />}>Simulation Activity</Button>
              </Link>
              {course.status !== 'published' && course.status !== 'archived' && (
                <Button block type="primary" icon={<RocketOutlined />} loading={actionBusy} onClick={handlePublish}>
                  Publish Course
                </Button>
              )}
              {course.status !== 'archived' ? (
                <Button block icon={<InboxOutlined />} loading={actionBusy} onClick={handleArchive}>Archive</Button>
              ) : (
                <Popconfirm
                  title="Restore this course?"
                  description="The course will be moved back to draft and will not be visible to students until published."
                  onConfirm={handleRestore}
                  okText="Restore"
                >
                  <Button block icon={<ReloadOutlined />} loading={actionBusy}>Restore Course</Button>
                </Popconfirm>
              )}
              <Button block icon={<CopyOutlined />} loading={actionBusy} onClick={handleClone}>Clone Course</Button>
              {canDelete && (
                <Popconfirm
                  title="Delete course?"
                  description={`Permanently delete "${course.title}"? This cannot be undone.`}
                  onConfirm={handleDelete}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button block danger type="text" icon={<DeleteOutlined />} loading={actionBusy}>Delete Course</Button>
                </Popconfirm>
              )}
            </div>
          </section>

          <details className={`${s.panel} ${s.collapsible} ${s.railAccordion}`}>
            <summary>
              Course Details
              <RightOutlined className={s.chevron} aria-hidden />
            </summary>
            <dl className={s.detailList}>
              {course.departmentName && <FragmentRow label="Discipline" value={course.departmentName} />}
              <FragmentRow label="Course Type" value="Interactive 3D Simulation" />
              {course.semesterTermName && <FragmentRow label="Semester" value={course.semesterTermName} />}
              {course.academicYearName && <FragmentRow label="Academic Year" value={course.academicYearName} />}
              <FragmentRow label="Enrollment" value={ENROLL_TYPE_LABEL[course.enrollmentType] ?? course.enrollmentType} />
              {course.enrollmentCap != null && <FragmentRow label="Capacity" value={`${course.enrollmentCap} seats`} />}
              {course.startDate && <FragmentRow label="Start Date" value={formatDate(course.startDate)} />}
              {course.endDate && <FragmentRow label="End Date" value={formatDate(course.endDate)} />}
              <FragmentRow label="Created" value={formatDate(course.createdAt)} />
            </dl>
          </details>
        </aside>

        {/* Main column */}
        <div className={`${s.areaMain} ${s.mainStack}`}>
          {sim && simName && (
            <section className={`${s.panel} ${s.simCompact}`} aria-labelledby="main-sim">
              <div className={s.simViewport} aria-hidden>
                <div className={s.simChrome}>
                  <span className={s.simDots}><span /><span /><span /></span>
                </div>
                <div
                  className={`${s.simScreen} ${sim.simThumb ? s.simScreenImage : ''}`}
                  style={sim.simThumb ? { backgroundImage: `url(${sim.simThumb})` } : undefined}
                >
                  {!sim.simThumb && <ExperimentOutlined />}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <span className={s.eyebrow}>Main Interactive Simulation</span>
                <h2 className={s.simCompactTitle} id="main-sim">{simName}</h2>
                <div className={s.metaRow}>
                  {sim.webgl && <Chip tone="info" icon={<ThunderboltOutlined />}>WebGL</Chip>}
                  {sim.isRequired && <Chip tone="neutral">Required</Chip>}
                  {sim.minutes != null && <Chip tone="neutral" icon={<ClockCircleOutlined />}>{formatMinutes(sim.minutes)}</Chip>}
                </div>
                <p className={s.meta} style={{ margin: '10px 0 0' }}>
                  Preview this simulation as an instructor. Used in module <strong>{mainSim.m.title}</strong>.
                </p>
                <div className={s.actionRow}>
                  {simPreviewHref ? (
                    <Link href={simPreviewHref}>
                      <Button type="primary" icon={<EyeOutlined />}>Preview Simulation</Button>
                    </Link>
                  ) : (
                    <Button icon={<EyeOutlined />} disabled>Preview Simulation</Button>
                  )}
                  {sim.simulationId && (
                    <Link href={`/simulations/${sim.simulationId}`}>
                      <Button icon={<FileTextOutlined />}>View Details</Button>
                    </Link>
                  )}
                  <Link href={`/courses/${id}/activity`}>
                    <Button type="text" icon={<BarChartOutlined />}>Simulation Activity</Button>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Course contents — management view */}
          <section id="course-contents" className={s.contents} aria-labelledby="contents-title">
            <div className={s.contentsHead}>
              <div>
                <h2 className={s.sectionTitle} id="contents-title">Course Contents</h2>
                <p className={s.sectionIntro}>
                  {outline.length} module{outline.length !== 1 ? 's' : ''} · {activityCount} activit{activityCount !== 1 ? 'ies' : 'y'}
                  {totalMinutes > 0 && <> · {formatMinutes(totalMinutes)}</>}
                </p>
              </div>
              <Link href={editContentsHref}>
                <Button icon={<EditOutlined />}>Edit Contents</Button>
              </Link>
            </div>

            {outline.length === 0 ? (
              <div className={s.panel} style={{ padding: 24 }}>
                <EmptyState
                  description="No modules yet. Open the Builder to add the first module."
                  extra={<Link href={editContentsHref}><Button type="primary" icon={<EditOutlined />}>Open Builder</Button></Link>}
                />
              </div>
            ) : (
              <div className={s.moduleList}>
                {outline.map((mod, mi) => {
                  const open = isOpen(mod);
                  const panelId = `module-${mod.id}`;
                  return (
                    <div key={mod.id} className={`${s.module} ${s.moduleCalm}`}>
                      <button
                        type="button"
                        className={s.moduleHead}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => toggleModule(mod)}
                      >
                        <span className={s.moduleIndex}>{mi + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className={s.moduleTitle}>{mod.title}</span>
                          <span className={s.meta}>
                            {mod.lessons.length} activit{mod.lessons.length !== 1 ? 'ies' : 'y'}
                            {mod.lockReason && <> · <LockOutlined /> {mod.lockReason}</>}
                          </span>
                        </span>
                        {!mod.isPublished && <Chip tone="warning">Draft</Chip>}
                        <RightOutlined className={`${s.chevron} ${open ? s.chevronOpen : ''}`} />
                      </button>

                      {open && (
                        <div id={panelId}>
                          {mod.lessons.length === 0 ? (
                            <div className={s.lockNote}>No activities yet.</div>
                          ) : (
                            <ul className={s.lessonList}>
                              {mod.lessons.map((lesson) => (
                                <li key={lesson.id} className={s.lessonRow}>
                                  <span className={s.lessonStateIcon} aria-hidden>
                                    {lessonTypeIcon(lesson.mode, { color: isSimulation(lesson.mode) ? 'var(--sl-secondary)' : 'var(--sl-text-secondary)' })}
                                  </span>
                                  <div style={{ minWidth: 0 }}>
                                    <div className={s.lessonTitle}>{lesson.title}</div>
                                    <div className={s.metaRow} style={{ marginTop: 4 }}>
                                      <LessonTypeChip mode={lesson.mode} />
                                      {lesson.isRequired && <Chip tone="neutral">Required</Chip>}
                                      {!lesson.isPublished && <Chip tone="warning">Draft</Chip>}
                                      {lesson.minutes != null && (
                                        <span className={s.meta}><ClockCircleOutlined /> {formatMinutes(lesson.minutes)}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className={s.lessonAside}>
                                    {isQuiz(lesson.mode) && lesson.quizId && (
                                      <Link href={`/courses/${id}/quizzes/${lesson.quizId}/grade`}>
                                        <Button size="small" type="text" icon={<CheckSquareOutlined />}>Grade</Button>
                                      </Link>
                                    )}
                                    <Link href={activityHref(lesson.id)}>
                                      <Button size="small" type="text" icon={<EyeOutlined />}>Preview</Button>
                                    </Link>
                                    <Link href={`/courses/${id}/edit?tab=builder&lesson=${lesson.id}`}>
                                      <Button size="small" icon={<EditOutlined />}>Edit</Button>
                                    </Link>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {requirements.length > 0 && (
            <details className={`${s.panel} ${s.collapsible}`}>
              <summary>
                Completion Requirements
                <RightOutlined className={s.chevron} aria-hidden />
              </summary>
              <dl className={s.detailList}>
                {requirements.map((r) => (
                  <FragmentRow key={r.key} label={`Required ${r.unit}`} value={`${r.list.length}`} />
                ))}
                <FragmentRow label="Passing grade" value={`${course.passingGrade}%`} />
              </dl>
            </details>
          )}
        </div>
      </div>
    );
  }

  // ── Course pages for an enrolled student ──────────────────────────────────────
  // Every view shares the course header (with course navigation) and the Course
  // Contents tree on the right, in the same frame and column split as the
  // workspace (/home). The left column changes with ?view=:
  //   (none)       Home — up next, main simulation, contents preview
  //   simulations  every simulation activity in the course
  //   grades       progress, completion requirements, quizzes
  //   resources    simulation guide, browser requirements, support, course details
  if (isStudentEnrolled && tracked && progress && journey) {
    const currentModuleIndex = current ? outline.findIndex((m) => m.id === current.m.id) : -1;
    const currentModule = currentModuleIndex >= 0 ? outline[currentModuleIndex] : null;
    const currentModuleDone = currentModule ? done(currentModule.lessons.map((l) => ({ l, m: currentModule }))) : 0;
    const positionInModule = current ? current.m.lessons.findIndex((l) => l.id === current.l.id) + 1 : 0;
    const nextLockedModule = outline.find((m) => m.locked);
    const allDone = courseCompleted || (!current && progress.completedLessons >= progress.totalLessons);
    const quizEntries = entries.filter(({ l }) => isQuiz(l.mode));
    const openFromTree = (lesson: JourneyLesson) => {
      setTreeOpen(false);
      router.push(activityHref(lesson.id));
    };
    const tree = (showTitle: boolean) => (
      <CourseContentsTree
        modules={journey.modules}
        currentLessonId={current?.l.id ?? null}
        currentLabel="Up next"
        onSelectLesson={openFromTree}
        showTitle={showTitle}
      />
    );

    /** Status chip for an outline activity (used by the Simulations and Grades lists). */
    const stateChip = (l: OutlineLesson, m: OutlineModule) =>
      l.state === 'completed' ? <Chip tone="success" className={s.chipSm} icon={<CheckCircleFilled />}>Completed</Chip>
        : l.state === 'locked' ? <Chip tone="neutral" className={s.chipSm} icon={<LockOutlined />}>{lockMessage(m.unlockAt, true)}</Chip>
          : l.state === 'current' ? <Chip tone="primary" className={s.chipSm}>Up next</Chip>
            : <Chip tone="neutral" className={s.chipSm}>Not started</Chip>;

    // ── Home ──────────────────────────────────────────────────────────────────
    const homeView = (
      <>
        {/* Up next — the strongest action on the page and its only primary button */}
        {current ? (
          <section className={`${s.panel} ${s.continueCard} ${s.continueCardCompact}`} aria-labelledby="next-step">
            <div className={s.continueIcon} aria-hidden>{lessonTypeIcon(current.l.mode)}</div>
            <div style={{ minWidth: 0 }}>
              <span className={s.eyebrow} id="next-step">
                {progress.completedLessons === 0 ? 'Start here' : 'Up next'} · Activity {positionInModule} of {current.m.lessons.length} in {current.m.title}
              </span>
              <h2 className={s.continueTitle}>{current.l.title}</h2>
              <div className={s.metaRow}>
                <LessonTypeChip mode={current.l.mode} />
                {current.l.isRequired && <Chip tone="neutral">Required</Chip>}
                {current.l.minutes != null && (
                  <Chip tone="neutral" icon={<ClockCircleOutlined />}>{formatMinutes(current.l.minutes)}</Chip>
                )}
              </div>
            </div>
            <div className={s.continueAction}>
              <Link href={continueHref}>
                <Button type="primary" size="large" icon={<PlayCircleOutlined />}>
                  {progress.completedLessons === 0 ? 'Start Course' : 'Continue Course'}
                </Button>
              </Link>
            </div>
          </section>
        ) : (
          <section className={`${s.panel} ${s.continueCard} ${s.continueCardCompact} ${allDone ? s.continueCardDone : s.continueCardWaiting}`} aria-labelledby="next-step">
            <div className={s.continueIcon} aria-hidden>{allDone ? <CheckCircleFilled /> : <LockOutlined />}</div>
            <div style={{ minWidth: 0 }}>
              <span className={s.eyebrow} id="next-step">{allDone ? 'Course complete' : 'Up next'}</span>
              <h2 className={s.continueTitle}>
                {allDone
                  ? `All ${progress.totalLessons} activities completed`
                  : nextLockedModule ? nextLockedModule.title : 'No open activities'}
              </h2>
              <p className={s.meta} style={{ margin: 0 }}>
                {allDone
                  ? 'Choose any activity in Course Contents to review it.'
                  : nextLockedModule?.lockReason ?? 'Your instructor has not opened the next activities yet.'}
              </p>
            </div>
            <div className={s.continueAction}>
              <Link href={workspaceHref(id)}>
                <Button type={allDone ? 'primary' : 'default'} size="large" icon={<FileTextOutlined />}>
                  {allDone ? 'Review Course' : 'Open Course'}
                </Button>
              </Link>
            </div>
          </section>
        )}

        {/* Main interactive simulation — a browser/WebGL window, never a video frame */}
        {sim && simName && (
          <section className={`${s.panel} ${s.simCompact} ${s.simFeature}`} aria-labelledby="main-sim">
            <div className={s.simViewport} aria-hidden>
              <div className={s.simChrome}>
                <span className={s.simDots}><span /><span /><span /></span>
              </div>
              <div
                className={`${s.simScreen} ${sim.simThumb ? s.simScreenImage : ''}`}
                style={sim.simThumb ? { backgroundImage: `url(${sim.simThumb})` } : undefined}
              >
                {!sim.simThumb && <ExperimentOutlined />}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <span className={s.eyebrow}>Main Interactive Simulation</span>
              <h2 className={s.simCompactTitle} id="main-sim">{simName}</h2>
              <div className={s.metaRow}>
                {sim.webgl && <Chip tone="info" icon={<ThunderboltOutlined />}>WebGL</Chip>}
                {stateChip(sim, mainSim.m)}
                {sim.minutes != null && <Chip tone="neutral" icon={<ClockCircleOutlined />}>{formatMinutes(sim.minutes)}</Chip>}
              </div>
              <p className={s.meta} style={{ margin: '8px 0 0' }}>
                Launched from its activity in <strong>{mainSim.m.title}</strong>.
              </p>
              <div className={s.actionRow}>
                {sim.state !== 'locked' && (
                  <Link href={activityHref(sim.id)}>
                    <Button icon={sim.state === 'completed' ? <FileTextOutlined /> : <ExperimentOutlined />}>
                      {sim.state === 'completed' ? 'Review Activity' : 'Open Activity'}
                    </Button>
                  </Link>
                )}
                {sim.simulationId && (
                  <Link href={`/simulations/${sim.simulationId}`}>
                    <Button type="text">View Details</Button>
                  </Link>
                )}
                {simEntries.length > 1 && (
                  <Link href={courseTabHref(id, 'simulations')} className={s.inlineLink}>
                    All {simEntries.length} simulations
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Contents preview — the current module; the full structure is in the tree */}
        {currentModule && (
          <section className={`${s.panel} ${s.currentModule}`} aria-labelledby="current-module">
            <div className={s.currentModuleHead}>
              <div className={s.currentModuleRow}>
                <div style={{ minWidth: 0 }}>
                  <span className={s.eyebrow}>Current module · {currentModuleIndex + 1} of {outline.length}</span>
                  <h2 className={s.currentModuleTitle} id="current-module">{currentModule.title}</h2>
                </div>
                <span className={s.currentModuleCount}>
                  <strong>{currentModuleDone} of {currentModule.lessons.length}</strong> completed
                </span>
              </div>
              <div
                className={s.currentModuleBar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={currentModule.lessons.length}
                aria-valuenow={currentModuleDone}
                aria-label={`${currentModuleDone} of ${currentModule.lessons.length} activities completed`}
              >
                <div
                  className={`${s.progressFill} ${currentModuleDone === currentModule.lessons.length ? s.progressFillDone : ''}`}
                  style={{ width: `${currentModule.lessons.length ? (currentModuleDone / currentModule.lessons.length) * 100 : 0}%` }}
                />
              </div>
            </div>
            <ul className={s.lessonList}>
              {currentModule.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className={[
                    s.lessonRow,
                    lesson.state === 'completed' ? s.lessonDone : '',
                    lesson.state === 'current' ? s.lessonCurrent : '',
                    lesson.state === 'locked' ? s.lessonLocked : '',
                  ].join(' ')}
                  aria-current={lesson.state === 'current' ? 'step' : undefined}
                >
                  <span className={s.lessonStateIcon} aria-hidden>
                    {LESSON_STATE_ICON[lesson.state](lesson.mode)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className={s.lessonTitle}>{lesson.title}</div>
                    <div className={s.metaRow} style={{ marginTop: 4 }}>
                      <LessonTypeChip mode={lesson.mode} small />
                      {lesson.minutes != null && (
                        <span className={s.meta}><ClockCircleOutlined /> {formatMinutes(lesson.minutes)}</span>
                      )}
                      {lesson.state === 'completed' && <span className={`${s.meta} ${s.treeDoneText}`}>Completed</span>}
                    </div>
                  </div>
                  <div className={s.lessonAside}>{rowAction(lesson, currentModule)}</div>
                </li>
              ))}
            </ul>
            <div className={s.panelFooter}>
              <Link href={courseTabHref(id, 'contents')} className={s.inlineLink}>
                View all contents <RightOutlined />
              </Link>
            </div>
          </section>
        )}
      </>
    );

    // ── Simulations ───────────────────────────────────────────────────────────
    const simulationsView = (
      <section className={s.panel} aria-labelledby="sims-title">
        <div className={s.sectionHead}>
          <div>
            <h2 className={s.sectionTitle} id="sims-title">Simulations</h2>
            <span className={s.sectionHelper}>
              {done(simEntries)} of {simEntries.length} completed · launch each one from its activity
            </span>
          </div>
        </div>
        {simEntries.length === 0 ? (
          <EmptyState description="This course has no simulation activities yet." />
        ) : (
          <ul className={s.list}>
            {simEntries.map(({ l, m }) => (
              <li key={l.id} className={s.simRow}>
                <span
                  className={s.railSimThumb}
                  style={l.simThumb ? { backgroundImage: `url(${l.simThumb})` } : undefined}
                  aria-hidden
                >
                  {!l.simThumb && <ExperimentOutlined />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className={s.rowTitle}>{l.simTitle ?? l.title}</p>
                  <span className={s.meta}>{l.title} · {m.title}</span>
                  <div className={s.metaRow} style={{ marginTop: 4 }}>
                    {l.webgl && <Chip tone="info" className={s.chipSm} icon={<ThunderboltOutlined />}>WebGL</Chip>}
                    {stateChip(l, m)}
                    {l.minutes != null && <span className={s.meta}><ClockCircleOutlined /> {formatMinutes(l.minutes)}</span>}
                  </div>
                </div>
                {l.state !== 'locked' && (
                  <Link href={activityHref(l.id)}>
                    <Button size="small" color={l.state === 'completed' ? 'default' : 'primary'} variant="outlined">
                      {l.state === 'completed' ? 'Review' : 'Open Activity'}
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );

    // ── Grades ────────────────────────────────────────────────────────────────
    const gradeStats = [
      { key: 'acts', label: 'Activities completed', value: `${progress.completedLessons} / ${progress.totalLessons}`, icon: <UnorderedListOutlined /> },
      { key: 'sims', label: 'Simulations completed', value: `${done(simEntries)} / ${simEntries.length}`, icon: <ExperimentOutlined /> },
      { key: 'quiz', label: 'Quizzes completed', value: `${done(quizEntries)} / ${quizEntries.length}`, icon: <FormOutlined /> },
      { key: 'pass', label: 'Passing grade', value: `${course.passingGrade}%`, icon: <FlagOutlined /> },
    ];
    const gradesView = (
      <>
        <div className={`${s.panel} ${s.statStrip} ${s.statStripFour}`} role="list" aria-label="Course progress">
          {gradeStats.map((st) => (
            <div key={st.key} className={s.stat} role="listitem">
              <span className={s.statIcon} style={{ color: 'var(--sl-secondary)' }} aria-hidden>{st.icon}</span>
              <div style={{ minWidth: 0 }}>
                <span className={s.statValue}>{st.value}</span>
                <span className={s.statLabel}>{st.label}</span>
              </div>
            </div>
          ))}
        </div>

        <section className={`${s.panel} ${s.gradebookNote}`}>
          <BarChartOutlined aria-hidden />
          <span className={s.gradebookNoteText}>Scores and your current grade for this course are in the Gradebook.</span>
          <Link href="/gradebook"><Button size="small">Open Gradebook</Button></Link>
        </section>

        {requirements.length > 0 && (
          <section className={s.panel} aria-labelledby="req-title">
            <div className={s.sectionHead}>
              <h2 className={s.sectionTitle} id="req-title">Completion Requirements</h2>
            </div>
            <dl className={s.detailList}>
              {requirements.map((r) => (
                <FragmentRow key={r.key} label={r.title} value={`${done(r.list)} / ${r.list.length}`} />
              ))}
              <FragmentRow label="Passing grade" value={`${course.passingGrade}%`} />
            </dl>
          </section>
        )}

        <section className={s.panel} aria-labelledby="quiz-title">
          <div className={s.sectionHead}>
            <div>
              <h2 className={s.sectionTitle} id="quiz-title">Quizzes</h2>
              <span className={s.sectionHelper}>Open a quiz to see attempts, scores and due dates</span>
            </div>
          </div>
          {quizEntries.length === 0 ? (
            <EmptyState description="This course has no quizzes." />
          ) : (
            <ul className={s.list}>
              {quizEntries.map(({ l, m }) => (
                <li key={l.id} className={s.simRow}>
                  <span className={s.todoIcon} aria-hidden><FormOutlined /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className={s.rowTitle}>{l.title}</p>
                    <div className={s.metaRow} style={{ marginTop: 4 }}>
                      <span className={s.meta}>{m.title}</span>
                      {stateChip(l, m)}
                      {l.isRequired && <Chip tone="neutral" className={s.chipSm}>Required</Chip>}
                    </div>
                  </div>
                  {l.state !== 'locked' && (
                    <Link href={activityHref(l.id)}>
                      <Button size="small">{l.state === 'completed' ? 'Review' : 'Open Quiz'}</Button>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );

    // ── Resources ─────────────────────────────────────────────────────────────
    const resourcesView = (
      <>
        <div className={s.resourceGrid}>
          <section className={`${s.panel} ${s.resourceCard}`} aria-labelledby="res-guide">
            <span className={s.resourceIcon} aria-hidden><ExperimentOutlined /></span>
            <h2 className={s.sectionTitle} id="res-guide">Simulation guide</h2>
            <ol className={s.resourceSteps}>
              <li>Open the activity from Course Contents.</li>
              <li>Select <strong>Launch Simulation</strong>. It opens in your browser.</li>
              <li>Complete the guided activity inside the simulation.</li>
              <li>Return to the course and select <strong>Mark as Complete</strong>.</li>
            </ol>
          </section>

          <section className={`${s.panel} ${s.resourceCard}`} aria-labelledby="res-browser">
            <span className={s.resourceIcon} aria-hidden><ThunderboltOutlined /></span>
            <h2 className={s.sectionTitle} id="res-browser">Browser &amp; WebGL requirements</h2>
            <ul className={s.resourceSteps}>
              <li>A current version of Chrome, Edge, Firefox or Safari.</li>
              <li>WebGL and hardware acceleration enabled in the browser.</li>
              <li>A laptop or desktop is recommended for 3D simulations.</li>
              <li>A stable internet connection while the simulation loads.</li>
            </ul>
          </section>

          <section className={`${s.panel} ${s.resourceCard}`} aria-labelledby="res-support">
            <span className={s.resourceIcon} aria-hidden><TeamOutlined /></span>
            <h2 className={s.sectionTitle} id="res-support">Course support</h2>
            <p className={s.resourceText}>
              Questions about activities, deadlines or grades go to {course.instructorName ? <strong>{course.instructorName}</strong> : 'your instructor'}.
            </p>
            <Link href="/mail/compose"><Button size="small">Message your instructor</Button></Link>
          </section>

          <section className={`${s.panel} ${s.resourceCard}`} aria-labelledby="res-lms">
            <span className={s.resourceIcon} aria-hidden><AppstoreOutlined /></span>
            <h2 className={s.sectionTitle} id="res-lms">LMS access</h2>
            <p className={s.resourceText}>
              If your institution links BEDO to its learning management system, you can also open this
              course from the link your instructor posts there. Ask your instructor if you are not sure which link to use.
            </p>
          </section>
        </div>

        <section className={s.panel} aria-labelledby="details-title">
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle} id="details-title">Course Details</h2>
          </div>
          {course.description && <p className={s.detailDesc} style={{ padding: '12px 16px 0', margin: 0 }}>{course.description}</p>}
          <dl className={s.detailList}>
            {course.code && <FragmentRow label="Course code" value={course.code} />}
            {course.departmentName && <FragmentRow label="Discipline" value={course.departmentName} />}
            <FragmentRow label="Course Type" value="Interactive 3D Simulation" />
            {course.semesterTermName && <FragmentRow label="Semester" value={course.semesterTermName} />}
            {course.academicYearName && <FragmentRow label="Academic Year" value={course.academicYearName} />}
            {course.startDate && <FragmentRow label="Start Date" value={formatDate(course.startDate)} />}
            {course.endDate && <FragmentRow label="End Date" value={formatDate(course.endDate)} />}
          </dl>
          <div className={s.detailFooter}>
            <Popconfirm
              title="Drop this course?"
              description="You can re-enroll later if the course allows it."
              onConfirm={handleUnenroll}
              okText="Drop"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" className={s.heroDrop} loading={enrolling} disabled={enrolling}>
                Drop Course
              </Button>
            </Popconfirm>
          </div>
          {enrollError && <Alert type="error" title={enrollError} showIcon style={{ margin: '0 16px 16px' }} />}
        </section>
      </>
    );

    const activeTab = (COURSE_VIEWS as string[]).includes(view ?? '') ? (view as CourseTab) : 'home';
    const viewContent = activeTab === 'simulations' ? simulationsView
      : activeTab === 'grades' ? gradesView
        : activeTab === 'resources' ? resourcesView
          : homeView;

    return (
      <div className={`${s.page} ${s.learnFrame}`}>
        <CourseShellHeader
          courseId={id}
          title={course.title}
          chips={<>
            <Chip tone={enrolledChip.tone} icon={enrolledChip.icon}>{enrolledChip.label}</Chip>
            {course.code && <Chip tone="info">{course.code}</Chip>}
          </>}
          scope={[course.departmentName, course.semesterTermName, course.academicYearName]}
          progress={progress}
          currentModule={currentModule
            ? <>Current module: <strong>{currentModule.title}</strong> ({currentModuleIndex + 1} of {outline.length})</>
            : null}
          active={activeTab}
          onOpenContents={() => setTreeOpen(true)}
        />

        <Row gutter={[16, 16]} align="top">
          {/* Left — the selected course view */}
          <Col xs={24} lg={15} xl={16}>
            <div className={s.mainStack}>{viewContent}</div>
          </Col>

          {/* Right — persistent Course Contents tree (same component and position as the workspace) */}
          <Col xs={0} lg={9} xl={8}>
            <aside className={`${s.panel} ${s.tree}`}>
              {tree(true)}
            </aside>
          </Col>
        </Row>

        {/* Below 992px the tree moves into a drawer instead of a squeezed column */}
        <Drawer
          title="Course Contents"
          placement="right"
          open={treeOpen}
          onClose={() => setTreeOpen(false)}
          size={340}
          styles={{ body: { padding: 0 } }}
          rootClassName={s.page}
        >
          {tree(false)}
        </Drawer>
      </div>
    );
  }

  return (
    <div className={`${s.page} ${s.overviewGrid} ${s.overviewSplit}`}>
      {/* Course header */}
      <section className={`${s.panel} ${s.courseHero} ${s.areaHero}`}>
        <div
          className={s.courseHeroThumb}
          style={course.thumbnailUrl ? { backgroundImage: `url(${course.thumbnailUrl})` } : undefined}
          aria-hidden
        >
          {!course.thumbnailUrl && <ExperimentOutlined />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={s.metaRow} style={{ marginBottom: 8 }}>
            {isStudentEnrolled && (
              <Chip tone={enrolledChip.tone} icon={enrolledChip.icon}>{enrolledChip.label}</Chip>
            )}
            {enrollment?.status === 'pending' && (
              <Chip tone="warning" icon={<ClockCircleOutlined />}>Pending approval</Chip>
            )}
            {canManage && <StatusTag status={course.status} />}
            {course.code && <Chip tone="info">{course.code}</Chip>}
            {/* Enrollment type only matters before joining. */}
            {!isStudentEnrolled && enrollment?.status !== 'pending' && (
              <Chip tone="neutral">{ENROLL_TYPE_LABEL[course.enrollmentType] ?? course.enrollmentType}</Chip>
            )}
          </div>
          <h1 className={s.pathHeroTitle}>{course.title}</h1>
          <div className={s.metaRow}>
            {[course.departmentName, 'Interactive 3D Simulation', course.semesterTermName].filter(Boolean).map((part, i) => (
              <span key={i} className={`${s.meta} ${i > 0 ? s.dot : ''}`}>{part}</span>
            ))}
          </div>
          {course.description && <p className={`${s.detailDesc} ${s.clamp2}`} style={{ fontSize: 14 }}>{course.description}</p>}

          {renderAccess()}
        </div>
      </section>

      {/* Enrolled students with progress get the learning dashboard above; this layout
          serves visitors, pending requests, and enrolled students whose progress failed to load. */}

      {/* -- Main column ---------------------------------------------------------- */}
      <div className={`${s.areaMain} ${s.mainStack}`}>
      {/* Main interactive simulation (with the course's concepts as small chips) */}
      {sim && simName && (
        <section className={`${s.panel} ${s.simCompact}`} aria-labelledby="main-sim">
          {/* Browser/WebGL window frame — not a video player. */}
          <div className={s.simViewport} aria-hidden>
            <div className={s.simChrome}>
              <span className={s.simDots}><span /><span /><span /></span>
            </div>
            <div
              className={`${s.simScreen} ${sim.simThumb ? s.simScreenImage : ''}`}
              style={sim.simThumb ? { backgroundImage: `url(${sim.simThumb})` } : undefined}
            >
              {!sim.simThumb && <ExperimentOutlined />}
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <span className={s.eyebrow}>Main Interactive Simulation</span>
            <h2 className={s.simCompactTitle} id="main-sim">{simName}</h2>
            {/* At most three badges (section 10.4); "Interactive Simulation" is already the eyebrow. */}
            <div className={s.metaRow}>
              {sim.webgl && <Chip tone="info" icon={<ThunderboltOutlined />}>WebGL</Chip>}
              {sim.state === 'completed'
                ? <Chip tone="success" icon={<CheckCircleFilled />}>Completed</Chip>
                : sim.isRequired && <Chip tone="neutral">Required</Chip>}
              {sim.minutes != null && <Chip tone="neutral" icon={<ClockCircleOutlined />}>{formatMinutes(sim.minutes)}</Chip>}
            </div>
            <p className={s.meta} style={{ margin: '10px 0 0' }}>
              {isStudentEnrolled
                ? <>You launch this simulation from its activity in module <strong>{mainSim.m.title}</strong>.</>
                : 'A browser-based simulation with a guided activity.'}
            </p>
            <div className={s.actionRow}>
              {/* Opens the activity in the workspace — never the player directly. */}
              {isStudentEnrolled && tracked && sim.state !== 'locked' && (
                <Link href={activityHref(sim.id)}>
                  <Button icon={sim.state === 'completed' ? <FileTextOutlined /> : <ExperimentOutlined />}>
                    {sim.state === 'completed' ? 'Review in Course' : 'Open in Course'}
                  </Button>
                </Link>
              )}
              {sim.simulationId && (
                <Link href={`/simulations/${sim.simulationId}`}>
                  <Button type="text" icon={<FileTextOutlined />}>View Details</Button>
                </Link>
              )}
              {(!isStudentEnrolled || sim.state === 'locked') && (
                <span className={s.actionHint}>
                  {!isStudentEnrolled ? 'Enroll to access this simulation.' : mainSim.m.lockReason}
                </span>
              )}
            </div>
            {concepts.length > 0 && (
              <div className={s.conceptMini} aria-label="Concepts covered">
                {concepts.map((c) => <span key={c.key}>{c.label}</span>)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4 — Course contents */}
      <section id="course-contents" className={s.contents} aria-labelledby="contents-title">
        <div className={s.contentsHead}>
          <div>
            <h2 className={s.sectionTitle} id="contents-title">Course Contents</h2>
            <p className={s.sectionIntro}>
              Open any activity to continue in the course workspace.
            </p>
          </div>
          {canManage ? (
            <Link href={`/courses/${id}/edit`}>
              <Button size="small" icon={<EditOutlined />}>Edit</Button>
            </Link>
          ) : activityCount > 0 ? (
            <span className={s.meta}>
              {outline.length} module{outline.length !== 1 ? 's' : ''} · {activityCount} activit{activityCount !== 1 ? 'ies' : 'y'}
              {totalMinutes > 0 && <> · {formatMinutes(totalMinutes)}</>}
            </span>
          ) : null}
        </div>

        {outline.length === 0 ? (
          <div className={s.panel}>
            <EmptyState description="No activities have been added yet." />
          </div>
        ) : (
          <div className={s.moduleList}>
            {outline.map((mod, mi) => {
              const doneCount = mod.lessons.filter((l) => l.state === 'completed').length;
              const allDone = mod.tracked && mod.lessons.length > 0 && doneCount === mod.lessons.length;
              const open = isOpen(mod);
              const panelId = `module-${mod.id}`;
              return (
                <div key={mod.id} className={`${s.module} ${s.moduleCalm} ${mod.locked ? s.moduleLocked : ''}`}>
                  <button
                    type="button"
                    className={s.moduleHead}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggleModule(mod)}
                  >
                    <span className={`${s.moduleIndex} ${allDone ? s.moduleIndexDone : ''} ${mod.locked ? s.moduleIndexLocked : ''}`}>
                      {mod.locked ? <LockOutlined /> : allDone ? <CheckCircleFilled /> : mi + 1}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className={s.moduleTitle}>{mod.title}</span>
                      <span className={s.meta}>
                        {mod.tracked
                          ? `${doneCount} of ${mod.lessons.length} activities completed`
                          : `${mod.lessons.length} activit${mod.lessons.length !== 1 ? 'ies' : 'y'}`}
                      </span>
                    </span>
                    {!mod.isPublished && <Chip tone="warning">Draft</Chip>}
                    {mod.locked && <Chip tone="neutral" icon={<LockOutlined />}>{lockMessage(mod.unlockAt, true)}</Chip>}
                    {allDone && <Chip tone="success">Completed</Chip>}
                    <RightOutlined className={`${s.chevron} ${open ? s.chevronOpen : ''}`} />
                  </button>
                  {mod.tracked && !mod.locked && mod.lessons.length > 0 && (
                    <div className={s.moduleBar} aria-hidden>
                      <div
                        className={`${s.progressFill} ${allDone ? s.progressFillDone : ''}`}
                        style={{ width: `${(doneCount / mod.lessons.length) * 100}%` }}
                      />
                    </div>
                  )}

                  {open && (
                    <div id={panelId}>
                      {mod.locked && mod.lockReason && (
                        <div className={s.lockNote}><LockOutlined /> {mod.lockReason}</div>
                      )}
                      {mod.lessons.length === 0 ? (
                        <div className={s.lockNote}>No activities yet.</div>
                      ) : (
                        <ul className={s.lessonList}>
                          {mod.lessons.map((lesson) => (
                            <li
                              key={lesson.id}
                              className={[
                                s.lessonRow,
                                lesson.state === 'completed' ? s.lessonDone : '',
                                lesson.state === 'current' ? s.lessonCurrent : '',
                                lesson.state === 'locked' ? s.lessonLocked : '',
                              ].join(' ')}
                              aria-current={lesson.state === 'current' ? 'step' : undefined}
                            >
                              <span className={s.lessonStateIcon} aria-hidden>
                                {LESSON_STATE_ICON[lesson.state](lesson.mode)}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div className={s.lessonTitle}>
                                  {lesson.title}
                                  {lesson.state === 'current' && <span className={s.treeUpNextLabel} style={{ marginLeft: 8 }}>Up next</span>}
                                </div>
                                <div className={s.metaRow} style={{ marginTop: 4 }}>
                                  <LessonTypeChip mode={lesson.mode} />
                                  {lesson.isRequired && <Chip tone="neutral">Required</Chip>}
                                  {!lesson.isPublished && <Chip tone="warning">Draft</Chip>}
                                  {lesson.minutes != null && (
                                    <span className={s.meta}><ClockCircleOutlined /> {formatMinutes(lesson.minutes)}</span>
                                  )}
                                </div>
                              </div>
                              <div className={s.lessonAside}>{rowAction(lesson, mod)}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5 — Collapsed accordions */}
      <div className={s.accordions}>
        {requirements.length > 0 && (
          <details className={`${s.panel} ${s.collapsible}`}>
            <summary>
              Completion Requirements
              <RightOutlined className={s.chevron} aria-hidden />
            </summary>
            <dl className={s.detailList}>
              {requirements.map((r) => (
                <FragmentRow
                  key={r.key}
                  label={`Required ${r.unit}`}
                  value={tracked ? `${done(r.list)} / ${r.list.length}` : `${r.list.length}`}
                />
              ))}
              <FragmentRow label="Passing grade" value={`${course.passingGrade}%`} />
            </dl>
          </details>
        )}

        <details className={`${s.panel} ${s.collapsible}`}>
          <summary>
            Course Details
            <RightOutlined className={s.chevron} aria-hidden />
          </summary>
          <dl className={s.detailList}>
            {course.departmentName && <FragmentRow label="Discipline" value={course.departmentName} />}
            <FragmentRow label="Course Type" value="Interactive 3D Simulation" />
            {course.semesterTermName && <FragmentRow label="Semester" value={course.semesterTermName} />}
            {course.academicYearName && <FragmentRow label="Academic Year" value={course.academicYearName} />}
            {course.startDate && <FragmentRow label="Start Date" value={formatDate(course.startDate)} />}
            {course.endDate && <FragmentRow label="End Date" value={formatDate(course.endDate)} />}
            {course.enrollmentCap != null && <FragmentRow label="Capacity" value={`${course.enrollmentCap} seats`} />}
            <FragmentRow label="Passing Grade" value={`${course.passingGrade}%`} />
          </dl>
          {isStudentEnrolled && (
            <div className={s.detailFooter}>
              <Popconfirm
                title="Drop this course?"
                description="You can re-enroll later if the course allows it."
                onConfirm={handleUnenroll}
                okText="Drop"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" className={s.heroDrop} loading={enrolling} disabled={enrolling}>
                  Drop Course
                </Button>
              </Popconfirm>
            </div>
          )}
        </details>
      </div>
      </div>
    </div>
  );
}

/** One label/value pair inside a <dl>. */
function FragmentRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

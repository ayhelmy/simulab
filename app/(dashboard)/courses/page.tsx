'use client';

/**
 * Course Catalog — route /courses.
 * Student view, top to bottom: compact heading · Continue Learning (in-progress
 * courses only) · one catalog navigation panel (search, filters, sort + status
 * tabs) · course grid. Instructors and admins get a management view instead:
 * status-first course cards (Manage Course · Preview · Grade · Activity) or a
 * table, with a publication-status filter and no enrollment language.
 */

import {
  useState, useEffect, useCallback, useMemo, useSyncExternalStore,
  type CSSProperties, type MouseEvent, type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { listCourses, listMyEnrolledCourses } from '@/lib/courses';
import { getCourseJourney } from '@/lib/journey';
import type { Course, CourseJourney } from '@/types';
import {
  Input, Select, Button, Row, Col, Alert, Tabs, Popover, Skeleton, Segmented, Table,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, BookOutlined, PlayCircleOutlined, KeyOutlined, ExperimentOutlined,
  FilterOutlined, CalendarOutlined, TeamOutlined, LockOutlined, FileTextOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ArrowRightOutlined, SortAscendingOutlined,
  EyeOutlined, CheckSquareOutlined, BarChartOutlined, SettingOutlined, AppstoreOutlined, BarsOutlined,
} from '@ant-design/icons';
import EmptyState from '@/components/common/EmptyState';
import { ADMIN_PAGE_CLASS, StateBlock, LoadErrorCard } from '@/components/admin/adminUi';
import {
  Chip, ProgressBar, activityHref, formatDate, learningStyles as s, type ChipTone,
} from '@/components/student/studentUi';

const ENROLLMENT_LABEL: Record<string, string> = {
  open: 'Open Enrollment',
  approval: 'Approval Required',
  code: 'Code Required',
  admin: 'Admin Only',
};

const STATUS_TONE: Record<string, ChipTone> = {
  draft: 'warning', published: 'success', archived: 'neutral',
};

// Card / list layout for the management view. Browser storage only (best-effort).
const LAYOUT_KEY = 'bedo.courses.layout';
const LAYOUT_EVENT = 'bedo:courses-layout';
type Layout = 'cards' | 'list';
let sessionLayout: Layout = 'cards'; // used when storage is unavailable

function readLayout(): Layout {
  try {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    return stored === 'list' || stored === 'cards' ? stored : sessionLayout;
  } catch { return sessionLayout; }
}

function subscribeLayout(onChange: () => void) {
  window.addEventListener(LAYOUT_EVENT, onChange);
  return () => window.removeEventListener(LAYOUT_EVENT, onChange);
}

function changeLayout(v: Layout) {
  sessionLayout = v;
  try { window.localStorage.setItem(LAYOUT_KEY, v); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(LAYOUT_EVENT));
}

const isFuture = (iso?: string) => !!iso && Date.parse(iso) > Date.now();
const isPast = (iso?: string) => !!iso && Date.parse(iso) < Date.now();

// ── Student card state ───────────────────────────────────────────────────────

type TabKey = 'all' | 'enrolled' | 'open' | 'code' | 'ended';
type SortKey = 'recommended' | 'name' | 'semester';

type CardState =
  | 'inProgress'   // enrolled, some progress
  | 'notStarted'   // enrolled, 0% (or starts in the future)
  | 'enrolled'     // enrolled, progress unknown
  | 'completed'    // enrolled, 100%
  | 'ended'        // enrolled, end date passed
  | 'open' | 'approval' | 'code' | 'admin';

/** What the student can do next in a course, from its journey (best-effort). */
interface Learning {
  percent: number;
  nextId: string | null;
  nextTitle: string | null;
}

function learningFrom(journey: CourseJourney | null | undefined): Learning | null {
  if (!journey) return null;
  const next = journey.modules.flatMap((m) => m.lessons)
    .find((l) => !l.isLocked && l.completionStatus !== 'completed');
  return { percent: journey.progress.percentage, nextId: next?.id ?? null, nextTitle: next?.title ?? null };
}

function studentCardState(course: Course, enrolled: boolean, learning: Learning | null): CardState {
  if (enrolled) {
    // Date only for "Ended" — never "Completed" without progress data.
    if (isPast(course.endDate)) return 'ended';
    if (isFuture(course.startDate)) return 'notStarted';
    if (!learning) return 'enrolled';
    if (learning.percent >= 100) return 'completed';
    return learning.percent > 0 ? 'inProgress' : 'notStarted';
  }
  return course.enrollmentType as CardState;
}

/** Catalog order: what to continue first, then what can be joined, then the rest. */
const STATE_RANK: Record<CardState, number> = {
  inProgress: 0, enrolled: 0, notStarted: 1, completed: 2,
  open: 3, approval: 4, code: 5, admin: 6, ended: 7,
};

type ActionKind = 'primary' | 'default';

interface CardView {
  badge: { label: string; tone: ChipTone };
  action: { label: string; kind: ActionKind; href: string; icon?: ReactNode };
}

/**
 * Badge + one action per state. Courses to start get the primary button; every
 * other action is a secondary outline button, so the grid reads as browsing.
 * (Continue Learning above the grid owns the solid "Continue" actions.)
 */
function studentCardView(course: Course, state: CardState, learning: Learning | null): CardView {
  const detail = `/courses/${course.id}`;
  const resume = activityHref(course.id, learning?.nextId);
  switch (state) {
    case 'inProgress':
    case 'enrolled':
      return { badge: { label: 'Enrolled', tone: 'success' }, action: { label: 'Continue Course', kind: 'primary', href: resume, icon: <PlayCircleOutlined /> } };
    case 'notStarted':
      return { badge: { label: 'Enrolled', tone: 'success' }, action: { label: 'Start Course', kind: 'primary', href: resume, icon: <PlayCircleOutlined /> } };
    case 'completed':
      return { badge: { label: 'Completed', tone: 'success' }, action: { label: 'Review Course', kind: 'default', href: activityHref(course.id), icon: <FileTextOutlined /> } };
    case 'ended':
      return { badge: { label: 'Ended', tone: 'neutral' }, action: { label: 'Review Course', kind: 'default', href: activityHref(course.id), icon: <FileTextOutlined /> } };
    case 'open':
      // Enrollment happens on the course page (Enroll Now), so the card says both.
      return { badge: { label: 'Open Enrollment', tone: 'primary' }, action: { label: 'View & Enroll', kind: 'default', href: detail, icon: <ArrowRightOutlined /> } };
    case 'approval':
      // The course page offers "Request to Enroll".
      return { badge: { label: 'Approval Required', tone: 'warning' }, action: { label: 'Request Access', kind: 'default', href: detail } };
    case 'code':
      return { badge: { label: 'Code Required', tone: 'neutral' }, action: { label: 'Enter Code', kind: 'default', href: detail, icon: <KeyOutlined /> } };
    default:
      return { badge: { label: 'Admin-Managed', tone: 'neutral' }, action: { label: 'View Details', kind: 'default', href: detail } };
  }
}

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Courses' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'open', label: 'Open Enrollment' },
  { key: 'code', label: 'Code Required' },
  { key: 'ended', label: 'Ended' },
];

const TAB_EMPTY: Record<TabKey, string> = {
  all: 'No courses are available this semester yet.',
  enrolled: 'You aren’t enrolled in any current courses. Browse All Courses to enroll.',
  open: 'No open-enrollment courses right now.',
  code: 'No courses require an enrollment code right now.',
  ended: 'Courses you were enrolled in appear here after their end date.',
};

// ── Card ─────────────────────────────────────────────────────────────────────

/** One scannable line of enrollment information (icon + text), not a chip. */
interface Fact { key: string; icon: ReactNode; text: ReactNode; strong?: boolean }

function CourseCard({
  course, view, facts, learning, managerStatus,
}: {
  course: Course;
  view: CardView;
  facts: Fact[];
  /** Enrolled, in-progress courses show progress in place of enrollment facts. */
  learning: Learning | null;
  /** Admin / instructor view: show the publication status instead of an enrollment state. */
  managerStatus: boolean;
}) {
  const router = useRouter();
  const detailHref = `/courses/${course.id}`;
  const stop = (e: MouseEvent) => e.stopPropagation();

  const badge = managerStatus
    ? <Chip tone={STATUS_TONE[course.status] ?? 'neutral'} className={s.thumbBadge} style={{ textTransform: 'capitalize' }}>{course.status}</Chip>
    : <Chip tone={view.badge.tone} className={s.thumbBadge}>{view.badge.label}</Chip>;

  return (
    <article className={`${s.panel} ${s.courseCard}`} onClick={() => router.push(detailHref)}>
      <div
        className={`${s.courseThumb} ${s.courseThumbCompact}`}
        style={course.thumbnailUrl ? { backgroundImage: `url(${course.thumbnailUrl})` } : undefined}
      >
        {!course.thumbnailUrl && <BookOutlined aria-hidden />}
        {badge}
      </div>

      <div className={s.courseBody}>
        <h3 className={s.courseTitle}>
          <Link href={detailHref} onClick={stop}>{course.title}</Link>
        </h3>
        {/* Course attributes — subtle badge + discipline. */}
        <div className={s.metaRow}>
          <Chip tone="info" className={s.chipSm} icon={<ExperimentOutlined />}>Interactive Simulation Course</Chip>
          {course.departmentName && <span className={s.meta}>{course.departmentName}</span>}
        </div>
        {/* Always two lines tall so descriptions never change the card height. */}
        <p className={`${s.clamp2} ${s.cardDesc}`}>{course.description ?? ''}</p>

        {/* Enrollment information — the facts that support the decision. */}
        <div className={s.cardFacts}>
          {learning && learning.percent < 100 ? (
            <>
              <ProgressBar
                percent={learning.percent}
                label={learning.percent > 0 ? `${Math.round(learning.percent)}% complete` : 'Not started'}
              />
              {learning.percent === 0 && isFuture(course.startDate) ? (
                <span className={`${s.cardFact} ${s.cardFactStrong}`}>
                  <CalendarOutlined aria-hidden /> Starts {formatDate(course.startDate)}
                </span>
              ) : learning.nextTitle && (
                <span className={s.cardFact} title={`${learning.percent > 0 ? 'Next' : 'Start with'}: ${learning.nextTitle}`}>
                  <ArrowRightOutlined aria-hidden />
                  <span className={s.factLead}>{learning.percent > 0 ? 'Next:' : 'Start with:'}</span>
                  <strong>{learning.nextTitle}</strong>
                </span>
              )}
            </>
          ) : (
            facts.map((f) => (
              <span key={f.key} className={`${s.cardFact} ${f.strong ? s.cardFactStrong : ''}`}>{f.icon} {f.text}</span>
            ))
          )}
        </div>

        <div className={s.spacer} />
        <div className={s.cardFooter}>
          <Button
            block
            type={view.action.kind}
            icon={view.action.icon}
            onClick={(e) => { stop(e); router.push(view.action.href); }}
          >
            {view.action.label}
          </Button>
        </div>
      </div>
    </article>
  );
}

// ── Manager card + list (instructor / admin) ─────────────────────────────────
// Course management, not a catalog: publication status, teaching facts, and the
// four things an instructor does with a course. No enrollment or learning actions.

type ManagerAction = { key: string; label: string; href: (id: string) => string; icon: ReactNode };

const MANAGER_SECONDARY: ManagerAction[] = [
  { key: 'preview', label: 'Preview', href: (id) => `/courses/${id}/home`, icon: <EyeOutlined /> },
  { key: 'grade', label: 'Grade', href: (id) => `/courses/${id}/grade`, icon: <CheckSquareOutlined /> },
  { key: 'activity', label: 'Activity', href: (id) => `/courses/${id}/activity`, icon: <BarChartOutlined /> },
];

function CourseStatusChip({ status, className }: { status: Course['status']; className?: string }) {
  return (
    <Chip tone={STATUS_TONE[status] ?? 'neutral'} className={className} style={{ textTransform: 'capitalize' }}>
      {status}
    </Chip>
  );
}

function ManagerCourseCard({ course }: { course: Course }) {
  const router = useRouter();
  const manageHref = `/courses/${course.id}`;
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <article className={`${s.panel} ${s.courseCard}`} onClick={() => router.push(manageHref)}>
      <div
        className={`${s.courseThumb} ${s.courseThumbCompact}`}
        style={course.thumbnailUrl ? { backgroundImage: `url(${course.thumbnailUrl})` } : undefined}
      >
        {!course.thumbnailUrl && <BookOutlined aria-hidden />}
        <CourseStatusChip status={course.status} className={s.thumbBadge} />
      </div>

      <div className={s.courseBody}>
        <h3 className={s.courseTitle}>
          <Link href={manageHref} onClick={stop}>{course.title}</Link>
        </h3>
        <div className={s.metaRow}>
          <Chip tone="info" className={s.chipSm} icon={<ExperimentOutlined />}>Interactive Simulation Course</Chip>
          {/* Always shown so card facts line up across the grid. */}
          <span className={s.meta}>{course.departmentName ?? 'No department'}</span>
        </div>

        <div className={s.cardFacts}>
          <span className={s.cardFact}><CalendarOutlined aria-hidden /> {course.semesterTermName ?? 'No term set'}</span>
          <span className={s.cardFact}>
            <TeamOutlined aria-hidden />
            <strong>{course.enrolledCount ?? '—'}</strong> enrolled students
          </span>
          {/* Always shown so card facts line up across the grid. */}
          <span className={s.cardFact}>
            <AppstoreOutlined aria-hidden />
            <strong>{course.moduleCount ?? '—'}</strong> module{course.moduleCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={s.spacer} />
        <div className={s.cardFooter}>
          <Button block type="primary" icon={<SettingOutlined />} onClick={(e) => { stop(e); router.push(manageHref); }}>
            Manage Course
          </Button>
          <div className={s.managerCardActions} style={{ '--cols': 3 } as CSSProperties}>
            {MANAGER_SECONDARY.map((a) => (
              <Button key={a.key} size="small" onClick={(e) => { stop(e); router.push(a.href(course.id)); }}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function ManagerCourseTable({ courses }: { courses: Course[] }) {
  return (
    <div className={s.panel} style={{ overflow: 'hidden' }}>
      <Table<Course>
        size="middle"
        rowKey="id"
        dataSource={courses}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          {
            title: 'Course', dataIndex: 'title',
            render: (title: string, c) => (
              <div style={{ minWidth: 0 }}>
                <Link href={`/courses/${c.id}`} className={s.tableTitle}>{title}</Link>
                <span className={s.meta} style={{ display: 'block' }}>
                  {[c.code, c.departmentName].filter(Boolean).join(' · ') || 'Interactive Simulation Course'}
                </span>
              </div>
            ),
          },
          { title: 'Status', dataIndex: 'status', width: 110, render: (st: Course['status']) => <CourseStatusChip status={st} /> },
          {
            title: 'Term', dataIndex: 'semesterTermName', width: 150,
            render: (v: string | null) => v ?? <span className={s.meta}>—</span>,
          },
          {
            title: 'Enrolled', dataIndex: 'enrolledCount', width: 90, align: 'right',
            render: (v?: number) => <span className={s.numeric}>{v ?? '—'}</span>,
          },
          {
            title: 'Modules', dataIndex: 'moduleCount', width: 90, align: 'right',
            render: (v?: number) => <span className={s.numeric}>{v ?? '—'}</span>,
          },
          {
            title: '', key: 'actions', width: 330, align: 'right',
            render: (_: unknown, c) => (
              <div className={s.rowActions}>
                {MANAGER_SECONDARY.map((a) => (
                  <Link key={a.key} href={a.href(c.id)}><Button size="small" type="text" icon={a.icon}>{a.label}</Button></Link>
                ))}
                <Link href={`/courses/${c.id}`}><Button size="small" icon={<SettingOutlined />}>Manage</Button></Link>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// ── Continue Learning ────────────────────────────────────────────────────────

function ContinueLearning({ items }: { items: { course: Course; learning: Learning }[] }) {
  const router = useRouter();
  return (
    <section className={`${s.panel} ${s.resumePanel}`} aria-labelledby="continue-learning">
      <h2 className={s.sectionTitle} id="continue-learning">Continue Learning</h2>
      <ul className={s.resumeList}>
        {items.map(({ course, learning }) => (
          <li key={course.id} className={s.resumeItem}>
            <span
              className={s.resumeThumb}
              style={course.thumbnailUrl ? { backgroundImage: `url(${course.thumbnailUrl})` } : undefined}
              aria-hidden
            >
              {!course.thumbnailUrl && <BookOutlined />}
            </span>
            <div className={s.resumeBody}>
              <Link href={`/courses/${course.id}`} className={s.resumeTitle}>{course.title}</Link>
              <ProgressBar percent={learning.percent} label={`${Math.round(learning.percent)}%`} />
              {learning.nextTitle && (
                <span className={s.resumeNext} title={`Next: ${learning.nextTitle}`}>
                  <span className={s.factLead}>Next:</span>
                  <strong>{learning.nextTitle}</strong>
                </span>
              )}
            </div>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => router.push(activityHref(course.id, learning.nextId))}
              aria-label={`Continue ${course.title}`}
            >
              Continue
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const { user, hasRole } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [statusFilter, setStatus] = useState<string | undefined>();
  const [tab, setTab] = useState<TabKey>('all');
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [journeys, setJourneys] = useState<Record<string, CourseJourney | null>>({});
  const [discipline, setDiscipline] = useState<string | undefined>();
  const [semester, setSemester] = useState<string | undefined>();
  const [access, setAccess] = useState<string | undefined>();
  const [sort, setSort] = useState<SortKey>('recommended');
  // The instructor's card/list choice, remembered per browser (cards on the server).
  const layout = useSyncExternalStore(subscribeLayout, readLayout, () => 'cards' as const);

  const isAdmin      = hasRole('super_admin') || hasRole('institution_admin') || hasRole('dept_manager');
  const isInstructor = !isAdmin && (hasRole('instructor') || hasRole('teaching_assistant'));
  const canManage    = isAdmin || isInstructor;
  const canCreate    = hasRole('super_admin') || hasRole('instructor');
  const isStudentView = !canManage;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { courses: data } = await listCourses({
        limit: 50,
        search:       debouncedSearch || undefined,
        status:       (statusFilter as Course['status']) || undefined,
        // Instructors only see their own courses; pass explicitly so the intent
        // is clear even though the backend enforces it via role as well.
        instructorId: isInstructor ? user.id : undefined,
      });
      setCourses(data);
    } catch (e: unknown) {
      const err = e as { detail?: string; title?: string };
      setError(err?.detail ?? err?.title ?? 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, statusFilter, isInstructor]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Students: which courses they're enrolled in (drives tabs + card actions).
  // Best-effort — on failure the catalog still renders, just without enrollment state.
  useEffect(() => {
    if (!user || !isStudentView) return;
    listMyEnrolledCourses().then(setEnrolledCourses).catch(() => setEnrolledCourses([]));
  }, [user, isStudentView]);

  // Progress + next activity for current enrolled courses (the same journey the
  // course page loads). Best-effort: a failed course just shows no progress.
  useEffect(() => {
    const current = enrolledCourses.filter((c) => !isPast(c.endDate));
    if (!current.length) return;
    Promise.allSettled(current.map((c) => getCourseJourney(c.id))).then((results) => {
      const next: Record<string, CourseJourney | null> = {};
      results.forEach((r, i) => { next[current[i].id] = r.status === 'fulfilled' ? r.value : null; });
      setJourneys(next);
    });
  }, [enrolledCourses]);

  const enrolledIds = useMemo(() => new Set(enrolledCourses.map((c) => c.id)), [enrolledCourses]);
  const learningOf = useCallback((id: string) => learningFrom(journeys[id]), [journeys]);
  const stateOf = useCallback(
    (c: Course) => studentCardState(c, enrolledIds.has(c.id), learningOf(c.id)),
    [enrolledIds, learningOf],
  );

  // Filter options come from the courses actually listed.
  const allListed = useMemo(() => {
    const byId = new Map<string, Course>();
    [...courses, ...enrolledCourses].forEach((c) => byId.set(c.id, c));
    return [...byId.values()];
  }, [courses, enrolledCourses]);
  const optionsOf = (pick: (c: Course) => string | null | undefined) =>
    [...new Set(allListed.map(pick).filter(Boolean) as string[])].sort().map((v) => ({ value: v, label: v }));
  const disciplineOptions = optionsOf((c) => c.departmentName);
  const semesterOptions = optionsOf((c) => c.semesterTermName);
  const accessOptions = [...new Set(allListed.map((c) => c.enrollmentType))]
    .map((v) => ({ value: v, label: ENROLLMENT_LABEL[v] ?? v }));
  const activeFilters = [discipline, semester, access].filter(Boolean).length;

  const tabLists = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const matches = (c: Course) =>
      (!q || c.title.toLowerCase().includes(q) || !!c.description?.toLowerCase().includes(q))
      && (!discipline || c.departmentName === discipline)
      && (!semester || c.semesterTermName === semester)
      && (!access || c.enrollmentType === access);
    const mine = enrolledCourses.filter(matches);
    const listed = courses.filter(matches);
    return {
      all: listed,
      enrolled: mine.filter((c) => !isPast(c.endDate)),
      open: listed.filter((c) => c.enrollmentType === 'open' && !enrolledIds.has(c.id)),
      code: listed.filter((c) => c.enrollmentType === 'code' && !enrolledIds.has(c.id)),
      ended: mine.filter((c) => isPast(c.endDate)),
    } satisfies Record<TabKey, Course[]>;
  }, [courses, enrolledCourses, enrolledIds, debouncedSearch, discipline, semester, access]);

  const visible = useMemo(() => {
    const list = [...(isStudentView ? tabLists[tab] : tabLists.all)];
    const byName = (a: Course, b: Course) => a.title.localeCompare(b.title);
    if (sort === 'name') return list.sort(byName);
    if (sort === 'semester') {
      return list.sort((a, b) => (Date.parse(b.startDate ?? '') || 0) - (Date.parse(a.startDate ?? '') || 0) || byName(a, b));
    }
    if (!isStudentView) return list;
    // Recommended: courses to continue first (most progress first), then joinable, then the rest.
    return list.sort((a, b) =>
      STATE_RANK[stateOf(a)] - STATE_RANK[stateOf(b)]
      || (learningOf(b.id)?.percent ?? 0) - (learningOf(a.id)?.percent ?? 0)
      || byName(a, b));
  }, [tabLists, tab, sort, isStudentView, stateOf, learningOf]);

  // Continue Learning: current enrolled courses with progress between 0 and 100%.
  const resumeItems = useMemo(() => enrolledCourses
    .filter((c) => stateOf(c) === 'inProgress')
    .map((c) => ({ course: c, learning: learningOf(c.id)! }))
    .sort((a, b) => b.learning.percent - a.learning.percent)
    .slice(0, 3), [enrolledCourses, stateOf, learningOf]);
  const resumeIds = new Set(resumeItems.map((r) => r.course.id));

  const distinctTerms = new Set(visible.map((c) => c.semesterTermName).filter(Boolean)).size;

  function factsFor(c: Course, state: CardState): Fact[] {
    const facts: Fact[] = [];
    if (canManage) facts.push({ key: 'access', icon: <KeyOutlined />, text: ENROLLMENT_LABEL[c.enrollmentType] ?? c.enrollmentType });
    if (c.semesterTermName && (distinctTerms > 1 || !isStudentView)) {
      facts.push({ key: 'term', icon: <CalendarOutlined />, text: c.semesterTermName });
    }
    if (state === 'ended' && c.endDate) {
      facts.push({ key: 'ended', icon: <ClockCircleOutlined />, text: `Ended ${formatDate(c.endDate)}` });
    } else if (isFuture(c.startDate)) {
      facts.push({ key: 'start', icon: <CalendarOutlined />, text: `Starts ${formatDate(c.startDate)}`, strong: true });
    }
    if (state === 'completed') facts.push({ key: 'done', icon: <CheckCircleOutlined />, text: 'All activities completed' });
    const joinable = canManage || !enrolledIds.has(c.id);
    if (joinable && c.enrollmentCap != null) facts.push({ key: 'seats', icon: <TeamOutlined />, text: `${c.enrollmentCap} seats` });
    if (isStudentView && state === 'approval') facts.push({ key: 'req', icon: <LockOutlined />, text: 'Instructor approval needed', strong: true });
    if (isStudentView && state === 'code') facts.push({ key: 'req', icon: <KeyOutlined />, text: 'Enrollment code needed', strong: true });
    if (isStudentView && state === 'admin') facts.push({ key: 'req', icon: <LockOutlined />, text: 'Enrolled by your administrator', strong: true });
    return facts;
  }

  const isDeptManager = hasRole('dept_manager');
  // Institution Admin (and not also teaching): institution management framing.
  const isInstAdmin  = hasRole('institution_admin') && !isInstructor && !isStudentView;
  const pageTitle    = isInstructor ? 'My Courses' : isDeptManager ? 'Department Courses' : isInstAdmin ? 'Courses' : isAdmin ? 'All Courses' : 'Course Catalog';
  const pageSubtitle = isDeptManager
    ? 'Courses in your department'
    : isInstAdmin
    ? 'Manage all courses in your institution: review setup, enrollment, grading, and simulation activity.'
    : isAdmin
    ? 'All courses in your institution'
    : isInstructor ? 'Courses you teach and manage.' : 'Courses available this semester. Continue the ones you’re enrolled in, or enroll in a new one.';

  const tabLabel = (label: string, key: TabKey) => (
    <span>{label}<span className={s.tabCount}>{tabLists[key].length}</span></span>
  );

  const clearFilters = () => { setDiscipline(undefined); setSemester(undefined); setAccess(undefined); };
  const filterPanel = (
    <div className={s.filterPanel}>
      <label className={s.filterField}>
        <span>Discipline</span>
        <Select allowClear placeholder="All disciplines" value={discipline} onChange={setDiscipline} options={disciplineOptions} />
      </label>
      <label className={s.filterField}>
        <span>Semester</span>
        <Select allowClear placeholder="All semesters" value={semester} onChange={setSemester} options={semesterOptions} />
      </label>
      <label className={s.filterField}>
        <span>Access</span>
        <Select allowClear placeholder="Any access" value={access} onChange={setAccess} options={accessOptions} />
      </label>
      <Button type="link" size="small" onClick={clearFilters} disabled={!activeFilters} style={{ padding: 0, alignSelf: 'flex-start' }}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className={`${s.page} ${s.catalogFrame}`}>
      {/* Heading — a page title, not a card */}
      <header className={s.catalogHead}>
        <div style={{ minWidth: 0 }}>
          <h1 className={s.title}>{pageTitle}</h1>
          <p className={s.sectionIntro}>{pageSubtitle}</p>
        </div>
        {canCreate && (
          <Link href="/courses/new">
            <Button type="primary" icon={<PlusOutlined />}>New Course</Button>
          </Link>
        )}
      </header>

      {/* 1 — Resume what you were doing */}
      {isStudentView && resumeItems.length > 0 && <ContinueLearning items={resumeItems} />}

      {/* 2 — Catalog navigation: search, filters and sort, connected to the status tabs */}
      <section className={`${s.panel} ${s.catalogNav}`} aria-label="Find courses">
        <div className={s.catalogToolbar}>
          <Input
            className={s.catalogSearch}
            placeholder="Search courses"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            aria-label="Search courses"
          />
          <div className={s.catalogControls}>
            <Popover trigger="click" placement="bottomRight" content={filterPanel} title="Filter courses">
              <Button icon={<FilterOutlined />}>
                Filters{activeFilters > 0 && <span className={s.tabCount}>{activeFilters}</span>}
              </Button>
            </Popover>
            <Select
              value={sort}
              onChange={setSort}
              aria-label="Sort courses"
              prefix={<SortAscendingOutlined />}
              className={s.catalogSort}
              options={[
                { value: 'recommended', label: isStudentView ? 'Recommended' : 'Default order' },
                { value: 'name', label: 'Course name' },
                { value: 'semester', label: 'Semester' },
              ]}
            />
            {canManage && (
              <Select
                placeholder="All statuses"
                value={statusFilter}
                onChange={setStatus}
                allowClear
                className={s.catalogSort}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
            )}
            {canManage && (
              <Segmented
                className={s.catalogLayout}
                aria-label="Course layout"
                value={layout}
                onChange={(v) => changeLayout(v as Layout)}
                options={[
                  { value: 'cards', icon: <AppstoreOutlined />, label: 'Cards' },
                  { value: 'list', icon: <BarsOutlined />, label: 'List' },
                ]}
              />
            )}
          </div>
        </div>

        {isStudentView && !error && (
          <>
            {/* Wide panel: tabs. */}
            <Tabs
              className={s.catalogTabs}
              activeKey={tab}
              onChange={(k) => setTab(k as TabKey)}
              items={TAB_ITEMS.map((t) => ({ key: t.key, label: tabLabel(t.label, t.key) }))}
            />
            {/* Narrow panel: the same statuses as wrapping buttons, so none hide in an overflow menu. */}
            <div className={s.statusChips} role="group" aria-label="Course status">
              {TAB_ITEMS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={tab === t.key}
                  className={`${s.statusChip} ${tab === t.key ? s.statusChipActive : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}<span className={s.tabCount}>{tabLists[t.key].length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 3 — Courses */}
      {loading ? (
        <Row gutter={[16, 16]} aria-busy="true" aria-label="Loading courses">
          {[0, 1, 2, 3].map((i) => (
            <Col key={i} xs={24} sm={12} lg={8} xl={6}>
              <div className={s.panel} style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
            </Col>
          ))}
        </Row>
      ) : error && isInstAdmin ? (
        <div className={ADMIN_PAGE_CLASS}>
          <LoadErrorCard
            title="Could not load courses"
            text="Your institution’s courses could not be loaded. Check the connection or try again."
            detail={error}
            onRetry={fetchCourses}
          />
        </div>
      ) : error ? (
        <Alert type="error" title={error} showIcon action={<Button size="small" onClick={fetchCourses}>Retry</Button>} />
      ) : visible.length === 0 && isInstAdmin ? (
        <div className={`${ADMIN_PAGE_CLASS} ${s.panel}`}>
          {debouncedSearch || activeFilters || statusFilter ? (
            <StateBlock
              kind="no-match"
              title="No courses match your search or filters"
              text="Try a different course name, or clear the filters and status."
              actions={<Button onClick={() => { setSearch(''); clearFilters(); setStatus(undefined); }}>Clear filters</Button>}
            />
          ) : (
            <StateBlock
              icon={<BookOutlined />}
              title="No courses in your institution yet"
              text="Courses appear here once instructors create them. You can then review their setup, enrollment, and grading."
            />
          )}
        </div>
      ) : visible.length === 0 ? (
        <div className={s.panel}>
          <EmptyState
            description={
              debouncedSearch || activeFilters
                ? 'No courses match your search or filters.'
                : isStudentView ? TAB_EMPTY[tab] : canManage ? 'No courses yet.' : 'No courses available.'
            }
            extra={
              debouncedSearch || activeFilters ? (
                <Button onClick={() => { setSearch(''); clearFilters(); }}>Clear search and filters</Button>
              ) : canCreate ? (
                <Link href="/courses/new"><Button type="primary" icon={<PlusOutlined />}>Create your first course</Button></Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          <p className={s.catalogCount}>
            {visible.length} {visible.length === 1 ? 'course' : 'courses'}
            {debouncedSearch && ` matching “${debouncedSearch}”`}
          </p>
          {canManage && layout === 'list' ? (
            <ManagerCourseTable courses={visible} />
          ) : canManage ? (
            <Row gutter={[16, 16]}>
              {visible.map((c) => (
                <Col key={c.id} xs={24} sm={12} lg={8} xl={6}>
                  <ManagerCourseCard course={c} />
                </Col>
              ))}
            </Row>
          ) : (
          <Row gutter={[16, 16]}>
            {visible.map((c) => {
              const learning = isStudentView ? learningOf(c.id) : null;
              const state = stateOf(c);
              const view = studentCardView(c, state, learning);
              // Continue Learning owns the resume action; the grid repeats it in a lighter weight.
              if (resumeIds.has(c.id) && view.action.kind === 'primary') view.action.kind = 'default';
              return (
                <Col key={c.id} xs={24} sm={12} lg={8} xl={6}>
                  <CourseCard
                    course={c}
                    view={view}
                    facts={factsFor(c, state)}
                    learning={learning}
                    managerStatus={false}
                  />
                </Col>
              );
            })}
          </Row>
          )}
        </>
      )}
    </div>
  );
}

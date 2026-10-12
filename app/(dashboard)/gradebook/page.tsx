'use client';

/**
 * Role-aware Gradebook (BEDO_DESIGN_SYSTEM.md §18–21):
 *   Student            → My Grades: personal results, course grades, what needs attention
 *   Instructor / TA    → Gradebook: needs-grading queue, submissions, grading
 *   Institution / Dept → Institution Gradebook: monitoring across courses
 *   Super Admin        → Platform Gradebook Overview: monitoring across institutions
 * Data loading is unchanged: the same course list + per-course gradebook calls.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { listCourses, listMyEnrolledCourses } from '@/lib/courses';
import { listInstitutions } from '@/lib/institutions';
import { getGradebook, getStudentGrades, submitGrade, updateGrade } from '@/lib/grades';
import type { Course } from '@/types';
import {
  Table, Select, Button, Typography, Input, Modal, InputNumber, App, Tooltip, Spin, Space, Grid,
  type TableColumnsType,
} from 'antd';
import {
  DownloadOutlined, SearchOutlined, EditOutlined, FileSearchOutlined, UserOutlined,
  BookOutlined, BankOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  LineChartOutlined, FileTextOutlined, AuditOutlined, LockOutlined,
} from '@ant-design/icons';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminHeader, AdminCard, Toolbar, ToolbarFilter,
  ResultCount, StateBlock, LoadErrorState, formatWhen,
} from '@/components/admin/adminUi';
import { Chip, ProgressBar, activityHref } from '@/components/student/studentUi';
import {
  gradebookStyles as g, type GradeRow, type KpiItem, type CsvColumn,
  deriveStatus, isGraded, reviewHref, matchesStatus, statusText, statusFilterOptions, typeFilterOptions,
  typeLabel, GradeStatusChip, GradeTypeChip, ScoreCell, PercentCell, KpiRow, averagePct, downloadCsv,
} from '@/components/gradebook/gradebookUi';

const { Text } = Typography;

type GradebookRole = 'student' | 'instructor' | 'institution' | 'department' | 'platform';

const COPY: Record<GradebookRole, {
  title: string; subtitle: string; search: string; recordsTitle: string;
  emptyTitle: string; emptyText: string;
}> = {
  student: {
    title: 'My Grades',
    subtitle: 'Track your quiz results, simulation scores, and course progress.',
    search: 'Search assignments or courses...',
    recordsTitle: 'All grades',
    emptyTitle: 'No grades yet',
    emptyText: 'Your grades will appear here after you complete quizzes or simulation activities.',
  },
  instructor: {
    title: 'Gradebook',
    subtitle: 'Review student submissions, grade quizzes and simulations, and monitor course performance.',
    search: 'Search student or assignment...',
    recordsTitle: 'Submissions and grades',
    emptyTitle: 'No submissions yet',
    emptyText: 'Student submissions and grades will appear here once learners complete quizzes or simulation activities.',
  },
  institution: {
    title: 'Institution Gradebook',
    subtitle: 'Monitor grades and assessment activity across institution courses.',
    search: 'Search student, course or assignment...',
    recordsTitle: 'Grade records',
    emptyTitle: 'No grade records yet',
    emptyText: 'Grades will appear here after students complete assessments in institution courses.',
  },
  department: {
    title: 'Department Gradebook',
    subtitle: 'Monitor grades and assessment activity across department courses.',
    search: 'Search student, course or assignment...',
    recordsTitle: 'Grade records',
    emptyTitle: 'No grade records yet',
    emptyText: 'Grades will appear here after students complete assessments in department courses.',
  },
  platform: {
    title: 'Platform Gradebook Overview',
    subtitle: 'Monitor assessment activity, pending grading, and grade records across institutions.',
    search: 'Search institution, course, student or assignment...',
    recordsTitle: 'Grade records',
    emptyTitle: 'No grade records yet',
    emptyText: 'Grade records will appear here once students complete assessments in institution courses.',
  },
};

const RECORDS_ID = 'grade-records';
const MOBILE_STEP = 20;

function OverrideModal({
  open, row, courseId, onClose, onSaved,
}: { open: boolean; row: GradeRow | null; courseId: string; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [score, setScore] = useState<number>(row?.score ?? 0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setScore(row?.score ?? 0); setNote(''); }, [row]);

  if (!row) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (row.gradeId) {
        await updateGrade(courseId, row.gradeId, { score, overrideNote: note || undefined });
      } else if (row.studentId) {
        await submitGrade(courseId, { gradeItemId: row.itemId, userId: row.studentId, score, pointsPossible: row.maxPoints });
      }
      message.success('Grade saved.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to save grade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`${row.score != null ? 'Override grade' : 'Grade'} — ${row.itemTitle}`}
      okText="Save grade"
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
    >
      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <Text type="secondary">{row.studentName} · {row.courseTitle}</Text>
        <GradeTypeChip type={row.itemType} />
      </div>
      <InputNumber
        min={0} max={row.maxPoints} value={score} onChange={v => setScore(v ?? 0)}
        addonAfter={`/ ${row.maxPoints}`} style={{ width: '100%', marginBottom: 12 }}
        aria-label="Score"
      />
      <Input.TextArea rows={2} placeholder="Override note (optional)" value={note} onChange={e => setNote(e.target.value)} />
    </Modal>
  );
}

/** Tooltipped icon button for table action columns (§21.6). */
function IconAction({ label, icon, onClick, href }: { label: string; icon: ReactNode; onClick?: () => void; href?: string }) {
  const btn = <Button size="small" type="text" icon={icon} aria-label={label} onClick={onClick} />;
  return <Tooltip title={label}>{href ? <Link href={href}>{btn}</Link> : btn}</Tooltip>;
}

export default function GradebookPage() {
  const { hasRole, hasPermission, user } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const isStudent = hasRole('student');
  const canManage = hasRole('instructor') || hasRole('teaching_assistant') ||
                     hasRole('super_admin') || hasRole('institution_admin') || hasRole('dept_manager');
  const canView = hasPermission('grades.view_own') || hasPermission('grades.view_course') || hasPermission('grades.view_department');
  // Writes are gated by this permission on the API, so only offer grading where it applies.
  const canEditGrades = hasPermission('grades.edit_course');
  const canViewUsers = hasPermission('users.view_institution') || hasPermission('users.view_all') || hasPermission('users.view_department');

  const role: GradebookRole = !canManage ? 'student'
    : hasRole('instructor') || hasRole('teaching_assistant') ? 'instructor'
    : hasRole('institution_admin') ? 'institution'
    : hasRole('dept_manager') ? 'department'
    : hasRole('super_admin') ? 'platform'
    : 'instructor';
  const copy = COPY[role];
  const forStudent = role === 'student';
  const isMonitor = role === 'institution' || role === 'department' || role === 'platform';

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesState, setCoursesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedCourses, setFailedCourses] = useState(0);
  const [viewLoaded, setViewLoaded] = useState(false);
  const [loadedCourseIds, setLoadedCourseIds] = useState<string[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [courseWeighted, setCourseWeighted] = useState<Record<string, number | null>>({});
  const [institutionNames, setInstitutionNames] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [institutionFilter, setInstitutionFilter] = useState<string | undefined>();
  const [overrideRow, setOverrideRow] = useState<GradeRow | null>(null);
  const [mobilePage, setMobilePage] = useState({ key: '', limit: MOBILE_STEP });

  const [coursesAttempt, setCoursesAttempt] = useState(0);

  useEffect(() => {
    if (!canView) return;
    // Student's own grades must reflect all active enrollments, not just courses in
    // their "current semester term" (listCourses applies that catalog-browsing filter).
    const request = canManage ? listCourses({ limit: 100 }).then(({ courses: list }) => list) : listMyEnrolledCourses();
    request
      .then(list => { setCourses(list); setCoursesState('ready'); })
      .catch(() => { setCourses([]); setCoursesState('error'); });
  }, [canView, canManage, coursesAttempt]);

  // Names for the institution filter and column; the view still works without them.
  useEffect(() => {
    if (role !== 'platform' || !hasPermission('institutions.view_all')) return;
    listInstitutions({ limit: 100 })
      .then(({ institutions }) => setInstitutionNames(Object.fromEntries(institutions.map(i => [i.id, i.name]))))
      .catch(() => setInstitutionNames({}));
  }, [role, hasPermission]);

  const loadInstructorView = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        courses.map(course => getGradebook(course.id).then(gb => ({ course, gb })).catch(() => null)),
      );
      const next: GradeRow[] = [];
      const counts: Record<string, number> = {};
      for (const entry of results) {
        if (!entry) continue;
        const { course, gb } = entry;
        counts[course.id] = gb.students.length;
        for (const student of gb.students) {
          for (const item of gb.items) {
            const cell = gb.grid[student.id]?.[item.id];
            const percentage = cell?.score != null ? Math.round((cell.score / item.maxPoints) * 10000) / 100 : null;
            next.push({
              key: `${course.id}:${student.id}:${item.id}`,
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              courseId: course.id,
              courseTitle: course.title,
              departmentName: course.departmentName ?? null,
              instructorName: course.instructorName ?? null,
              institutionId: course.institutionId ?? null,
              passingGrade: course.passingGrade ?? null,
              itemId: item.id,
              itemTitle: item.title,
              itemType: item.itemType,
              lessonId: item.lessonId ?? null,
              dueDate: item.dueDate ?? null,
              gradeId: cell?.id ?? null,
              score: cell?.score ?? null,
              maxPoints: item.maxPoints,
              percentage,
              gradedAt: cell?.gradedAt ?? null,
              isOverride: !!cell?.isOverride,
              status: deriveStatus(!!cell, percentage, item.dueDate, course.passingGrade ?? null),
              quizId: item.quizId,
              simulationId: item.simulationId,
              quizAttemptId: cell?.quizAttemptId,
              simulationScoreId: cell?.simulationScoreId,
            });
          }
        }
      }
      setRows(next);
      setStudentCounts(counts);
      setLoadedCourseIds(Object.keys(counts));
      setFailedCourses(results.filter(r => !r).length);
    } finally {
      setLoading(false);
      setViewLoaded(true);
    }
  }, [courses]);

  const loadStudentView = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        courses.map(course => getStudentGrades(course.id, user.id).then(r => ({ course, r })).catch(() => null)),
      );
      const next: GradeRow[] = [];
      const weighted: Record<string, number | null> = {};
      for (const entry of results) {
        if (!entry) continue;
        const { course, r } = entry;
        weighted[course.id] = r.weightedPct;
        for (const { item, grade } of r.grades) {
          const percentage = grade?.score != null ? Math.round((grade.score / item.maxPoints) * 10000) / 100 : null;
          next.push({
            key: `${course.id}:${item.id}`,
            courseId: course.id,
            courseTitle: course.title,
            departmentName: course.departmentName ?? null,
            instructorName: course.instructorName ?? null,
            institutionId: course.institutionId ?? null,
            passingGrade: course.passingGrade ?? null,
            itemId: item.id,
            itemTitle: item.title,
            itemType: item.itemType,
            lessonId: item.lessonId ?? null,
            dueDate: item.dueDate ?? null,
            gradeId: grade?.id ?? null,
            score: grade?.score ?? null,
            maxPoints: item.maxPoints,
            percentage,
            gradedAt: grade?.gradedAt ?? null,
            isOverride: !!grade?.isOverride,
            status: deriveStatus(!!grade, percentage, item.dueDate, course.passingGrade ?? null),
            studentName: '',
            quizId: item.quizId,
            simulationId: item.simulationId,
            quizAttemptId: grade?.quizAttemptId,
            simulationScoreId: grade?.simulationScoreId,
          });
        }
      }
      setRows(next);
      setCourseWeighted(weighted);
      setLoadedCourseIds(Object.keys(weighted));
      setFailedCourses(results.filter(r => !r).length);
    } finally {
      setLoading(false);
      setViewLoaded(true);
    }
  }, [courses, user]);

  useEffect(() => {
    if (canManage && courses.length) loadInstructorView();
  }, [canManage, courses, loadInstructorView]);

  useEffect(() => {
    if (isStudent && !canManage && courses.length) loadStudentView();
  }, [isStudent, canManage, courses, loadStudentView]);

  const reloadView = () => (canManage ? loadInstructorView() : loadStudentView());
  const loadError = coursesState === 'error' || (courses.length > 0 && !loading && failedCourses === courses.length);
  const retry = () => {
    if (coursesState === 'error') {
      setCoursesState('loading');
      setCoursesAttempt(n => n + 1);
    } else {
      reloadView();
    }
  };
  // Covers the gap between the course list arriving and the first gradebook load starting.
  const awaitingFirstLoad = (canManage || isStudent) && courses.length > 0 && !viewLoaded;
  const isLoading = coursesState === 'loading' || loading || awaitingFirstLoad;

  // ── Filtering ──────────────────────────────────────────────────────────────

  const institutionName = useCallback((id: string | null) => (id ? institutionNames[id] ?? null : null), [institutionNames]);

  /** Rows inside the scope filters (course / department / institution) — what the summary describes. */
  const scopeRows = useMemo(() => rows.filter(r =>
    (!courseFilter || r.courseId === courseFilter) &&
    (!deptFilter || r.departmentName === deptFilter) &&
    (!institutionFilter || r.institutionId === institutionFilter),
  ), [rows, courseFilter, deptFilter, institutionFilter]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopeRows.filter(r => {
      if (!matchesStatus(r, statusFilter)) return false;
      if (typeFilter && r.itemType !== typeFilter) return false;
      if (q) {
        const hay = [r.studentName, r.itemTitle, r.courseTitle, institutionName(r.institutionId) ?? ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopeRows, search, statusFilter, typeFilter, institutionName]);

  // "Show more" on phones starts over whenever the filters change.
  const filterKey = [search, statusFilter, courseFilter, typeFilter, deptFilter, institutionFilter].join('|');
  const mobileLimit = mobilePage.key === filterKey ? mobilePage.limit : MOBILE_STEP;
  const showMoreMobile = () => setMobilePage({ key: filterKey, limit: mobileLimit + MOBILE_STEP });

  const hasFilters = !!(search || statusFilter || courseFilter || typeFilter || deptFilter || institutionFilter);
  const clearFilters = () => {
    setSearch(''); setStatusFilter(undefined); setCourseFilter(undefined);
    setTypeFilter(undefined); setDeptFilter(undefined); setInstitutionFilter(undefined);
  };
  const toggleStatus = (s: string) => setStatusFilter(cur => (cur === s ? undefined : s));
  const focusCourse = (courseId: string) => {
    setCourseFilter(courseId);
    document.getElementById(RECORDS_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Summary ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const count = (pred: (r: GradeRow) => boolean) => scopeRows.filter(pred).length;
    const graded = count(r => isGraded(r.status));
    const total = scopeRows.length;
    const missingRows = scopeRows.filter(r => r.status === 'missing');
    return {
      total,
      graded,
      passed: count(r => r.status === 'passed'),
      failed: count(r => r.status === 'failed'),
      needsReview: count(r => r.status === 'needs_review'),
      missing: missingRows.length,
      notSubmitted: count(r => r.status === 'not_submitted'),
      avg: averagePct(scopeRows),
      completion: total ? Math.round((graded / total) * 100) : null,
      coursesWithMissing: new Set(missingRows.map(r => r.courseId)).size,
      coursesWithGrades: new Set(scopeRows.filter(r => isGraded(r.status)).map(r => r.courseId)).size,
      institutionsPending: new Set(scopeRows.filter(r => r.status === 'needs_review').map(r => r.institutionId)).size,
      institutions: new Set(scopeRows.map(r => r.institutionId)).size,
      usesPassMark: scopeRows.some(r => r.passingGrade != null && r.passingGrade > 0),
    };
  }, [scopeRows]);

  const pct = (v: number | null) => (v == null ? '—' : `${v}%`);
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const kpis = ((): KpiItem[] => {
    const pendingGrading: KpiItem = {
      key: 'pending', label: 'Pending Grading', icon: <ClockCircleOutlined />,
      value: stats.needsReview, tone: stats.needsReview > 0 ? 'warning' : undefined,
      sub: stats.needsReview > 0 ? 'Recorded, awaiting a score' : 'Nothing waiting for a score',
      onClick: () => toggleStatus('needs_review'), active: statusFilter === 'needs_review',
    };
    const completion: KpiItem = {
      key: 'completion', label: 'Assessment Completion', icon: <LineChartOutlined />,
      value: pct(stats.completion), tone: 'info',
      sub: `${stats.graded} of ${stats.total} expected assessments graded`,
    };
    const graded: KpiItem = {
      key: 'graded', label: role === 'instructor' ? 'Graded Submissions' : 'Completed Assessments', icon: <CheckCircleOutlined />,
      value: stats.graded, tone: 'success',
      sub: stats.avg != null ? `${stats.avg}% average score` : 'No scores yet',
      onClick: () => toggleStatus('graded'), active: statusFilter === 'graded',
    };
    switch (role) {
      case 'student': {
        const attention = stats.failed + stats.missing;
        return [
          {
            key: 'avg', label: 'Average Grade', icon: <LineChartOutlined />, value: pct(stats.avg), tone: 'info',
            sub: stats.coursesWithGrades ? `Across ${plural(stats.coursesWithGrades, 'course')} with grades` : 'No graded work yet',
          },
          {
            key: 'done', label: 'Completed Assessments', icon: <CheckCircleOutlined />, value: stats.graded, tone: 'success',
            sub: `of ${plural(stats.total, 'assessment')}`,
            onClick: () => toggleStatus('graded'), active: statusFilter === 'graded',
          },
          {
            key: 'pending', label: 'Pending Assessments', icon: <ClockCircleOutlined />, value: stats.notSubmitted + stats.needsReview,
            sub: stats.needsReview ? `${stats.needsReview} awaiting a grade` : 'Not yet submitted or graded',
          },
          stats.usesPassMark ? {
            key: 'attention', label: 'Passed / Needs Attention', icon: <ExclamationCircleOutlined />,
            value: `${stats.passed} / ${attention}`, tone: attention > 0 ? 'warning' : 'success',
            sub: attention > 0 ? `${stats.failed} failed · ${stats.missing} missing` : 'Nothing needs attention',
          } : {
            key: 'attention', label: 'Needs Attention', icon: <ExclamationCircleOutlined />,
            value: attention, tone: attention > 0 ? 'warning' : 'success',
            sub: attention > 0 ? 'Missing past their due date' : 'Nothing needs attention',
            onClick: attention > 0 ? () => toggleStatus('missing') : undefined, active: statusFilter === 'missing',
          },
        ];
      }
      case 'instructor':
        return [
          pendingGrading,
          graded,
          {
            key: 'missing', label: 'Missing Submissions', icon: <ExclamationCircleOutlined />,
            value: stats.missing, tone: stats.missing > 0 ? 'error' : undefined,
            sub: `${stats.notSubmitted} not submitted, not yet due`,
            onClick: () => toggleStatus('missing'), active: statusFilter === 'missing',
          },
          completion,
        ];
      case 'platform':
        return [
          { ...graded, label: 'Graded Assessments', sub: `${plural(stats.institutions, 'institution')} with grade records` },
          pendingGrading,
          {
            key: 'inst', label: 'Institutions with Pending Grading', icon: <BankOutlined />,
            value: stats.needsReview ? stats.institutionsPending : 0, tone: stats.needsReview ? 'warning' : undefined,
            sub: `of ${plural(stats.institutions, 'institution')}`,
          },
          { key: 'avg', label: 'Average Score', icon: <LineChartOutlined />, value: pct(stats.avg), tone: 'info', sub: 'Across all graded assessments' },
        ];
      default:
        return [
          completion,
          pendingGrading,
          graded,
          {
            key: 'missingCourses', label: 'Courses with Missing Grades', icon: <ExclamationCircleOutlined />,
            value: stats.coursesWithMissing, tone: stats.coursesWithMissing > 0 ? 'error' : undefined,
            sub: `${plural(stats.missing, 'missing submission')}`,
            onClick: () => toggleStatus('missing'), active: statusFilter === 'missing',
          },
        ];
    }
  })();

  // ── Course summaries ───────────────────────────────────────────────────────

  const courseSummaries = useMemo(() => {
    const scoped = deptFilter || institutionFilter
      ? rows.filter(r => (!deptFilter || r.departmentName === deptFilter) && (!institutionFilter || r.institutionId === institutionFilter))
      : rows;
    return courses
      .filter(c => loadedCourseIds.includes(c.id))
      .filter(c => (!deptFilter || c.departmentName === deptFilter) && (!institutionFilter || c.institutionId === institutionFilter))
      .map(c => {
        const cr = scoped.filter(r => r.courseId === c.id);
        const gradedRows = cr.filter(r => isGraded(r.status));
        const latest = gradedRows.filter(r => r.gradedAt).sort((x, y) => (y.gradedAt ?? '').localeCompare(x.gradedAt ?? ''))[0];
        const weighted = courseWeighted[c.id];
        return {
          course: c,
          total: cr.length,
          graded: gradedRows.length,
          pending: cr.filter(r => r.status === 'needs_review' || r.status === 'not_submitted').length,
          needsReview: cr.filter(r => r.status === 'needs_review').length,
          missing: cr.filter(r => r.status === 'missing').length,
          grade: weighted != null ? Math.round(weighted) : averagePct(cr),
          gradeIsWeighted: weighted != null,
          latest,
          students: studentCounts[c.id] ?? c.enrolledCount ?? null,
        };
      })
      .filter(s => forStudent ? s.total > 0 : true);
  }, [courses, loadedCourseIds, rows, deptFilter, institutionFilter, courseWeighted, studentCounts, forStudent]);

  const needsGrading = useMemo(
    () => scopeRows.filter(r => r.status === 'needs_review').sort((x, y) => (y.gradedAt ?? '').localeCompare(x.gradedAt ?? '')),
    [scopeRows],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const renderActions = (row: GradeRow): ReactNode => {
    const review = reviewHref(row);
    if (role === 'student') {
      if (review) return <Button size="small" icon={<FileSearchOutlined />} onClick={() => router.push(review)}>Review</Button>;
      if (!isGraded(row.status) && row.lessonId) {
        return <Link href={activityHref(row.courseId, row.lessonId)}><Button size="small">Open activity</Button></Link>;
      }
      return <span className={a.muted}>—</span>;
    }
    const items: ReactNode[] = [];
    if (role === 'instructor') {
      if (canEditGrades && !isGraded(row.status)) {
        items.push(<Button key="grade" size="small" icon={<AuditOutlined />} onClick={() => setOverrideRow(row)}>Grade</Button>);
      }
      if (review) items.push(<IconAction key="review" label="Review submission" icon={<FileSearchOutlined />} href={review} />);
      if (canEditGrades && isGraded(row.status)) {
        items.push(<IconAction key="override" label="Override grade" icon={<EditOutlined />} onClick={() => setOverrideRow(row)} />);
      }
      if (canViewUsers && row.studentId) items.push(<IconAction key="student" label="View student" icon={<UserOutlined />} href={`/users/${row.studentId}`} />);
    } else {
      if (review) items.push(<IconAction key="review" label="View details" icon={<FileSearchOutlined />} href={review} />);
      items.push(<IconAction key="course" label="Open course" icon={<BookOutlined />} href={`/courses/${row.courseId}`} />);
      if (role === 'platform' && row.institutionId) {
        items.push(<IconAction key="inst" label="Open institution" icon={<BankOutlined />} href={`/institutions/${row.institutionId}`} />);
      }
      if (canEditGrades) {
        items.push(<IconAction key="override" label={isGraded(row.status) ? 'Override grade' : 'Enter grade'} icon={<EditOutlined />} onClick={() => setOverrideRow(row)} />);
      }
    }
    return <span className={a.rowActions}>{items}</span>;
  };

  const actionsWidth = role === 'student' ? 130 : role === 'instructor' ? 160 : 130;

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: TableColumnsType<GradeRow> = [
    ...(role === 'platform' && Object.keys(institutionNames).length ? [{
      title: 'Institution', key: 'institution', width: 140,
      render: (_: unknown, r: GradeRow) => institutionName(r.institutionId) ?? <span className={a.muted}>—</span>,
    }] : []),
    ...(!forStudent ? [{
      title: 'Student', key: 'student', dataIndex: 'studentName', width: 140,
      sorter: (x: GradeRow, y: GradeRow) => x.studentName.localeCompare(y.studentName),
      render: (v: string) => <span className={a.cellTitle} style={{ fontSize: 13 }}>{v}</span>,
    }] : []),
    {
      title: 'Course', key: 'course', dataIndex: 'courseTitle', width: 150,
      render: (v: string, r: GradeRow) => (
        <>
          <span style={{ color: 'var(--ac-text-body)' }}>{v}</span>
          {isMonitor && r.departmentName && <span className={a.cellSub}>{r.departmentName}</span>}
        </>
      ),
    },
    {
      title: forStudent ? 'Activity' : 'Assignment', key: 'assignment', dataIndex: 'itemTitle', width: 210,
      render: (v: string, r: GradeRow) => (
        <>
          <span style={{ fontWeight: 500, color: 'var(--ac-text-primary)' }}>{v}</span>
          {!isGraded(r.status) && r.dueDate && (
            <span className={a.cellSub}>Due {new Date(r.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          )}
        </>
      ),
    },
    {
      title: 'Type', key: 'type', dataIndex: 'itemType', width: 120,
      render: (_: unknown, r: GradeRow) => <GradeTypeChip type={r.itemType} />,
    },
    {
      title: 'Score', key: 'score', align: 'right', width: 85,
      sorter: (x: GradeRow, y: GradeRow) => (x.score ?? -1) - (y.score ?? -1),
      render: (_: unknown, r: GradeRow) => <ScoreCell row={r} />,
    },
    {
      title: '%', key: 'percentage', align: 'right', width: 60,
      sorter: (x: GradeRow, y: GradeRow) => (x.percentage ?? -1) - (y.percentage ?? -1),
      render: (_: unknown, r: GradeRow) => <PercentCell pct={r.percentage} />,
    },
    {
      title: 'Status', key: 'status', width: 120,
      render: (_: unknown, r: GradeRow) => <GradeStatusChip row={r} forStudent={forStudent} />,
    },
    ...(role === 'institution' || role === 'department' ? [{
      title: 'Instructor', key: 'instructor', width: 140, responsive: ['xxl' as const],
      render: (_: unknown, r: GradeRow) => r.instructorName ?? <span className={a.muted}>—</span>,
    }] : []),
    {
      title: 'Graded', key: 'gradedAt', width: 105, responsive: forStudent ? ['lg'] : ['xxl'],
      sorter: (x: GradeRow, y: GradeRow) => (x.gradedAt ?? '').localeCompare(y.gradedAt ?? ''),
      render: (_: unknown, r: GradeRow) => r.gradedAt
        ? <span style={{ fontSize: 12, color: 'var(--ac-text-secondary)' }}>{formatWhen(r.gradedAt)}</span>
        : <span className={a.muted}>—</span>,
    },
    {
      title: 'Actions', key: 'actions', align: 'right', width: actionsWidth, fixed: 'right',
      render: (_: unknown, r: GradeRow) => renderActions(r),
    },
  ];

  // Scroll only when the columns genuinely don't fit; the sum keeps every column at its width.
  const tableMinWidth = columns
    .filter(c => !c.responsive || c.responsive.some(bp => screens[bp]))
    .reduce((sum, c) => sum + (typeof c.width === 'number' ? c.width : 0), 0);

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportCsv = () => {
    const cols: CsvColumn[] = [
      ...(role === 'platform' ? [{ header: 'Institution', value: (r: GradeRow) => institutionName(r.institutionId) ?? '' }] : []),
      { header: 'Student', value: r => r.studentName },
      { header: 'Course', value: r => r.courseTitle },
      ...(isMonitor ? [{ header: 'Department', value: (r: GradeRow) => r.departmentName ?? '' }] : []),
      { header: 'Assignment', value: r => r.itemTitle },
      { header: 'Type', value: r => typeLabel(r.itemType) },
      { header: 'Score', value: r => r.score },
      { header: 'Max points', value: r => r.maxPoints },
      { header: 'Percentage', value: r => (r.percentage != null ? Math.round(r.percentage) : '') },
      { header: 'Status', value: r => statusText(r.status) },
      { header: 'Graded at', value: r => r.gradedAt ?? '' },
      ...(isMonitor ? [{ header: 'Instructor', value: (r: GradeRow) => r.instructorName ?? '' }] : []),
    ];
    downloadCsv(filteredRows, cols, `gradebook-${new Date().toISOString().slice(0, 10)}.csv`);
    message.success(`Exported ${plural(filteredRows.length, 'row')}${hasFilters ? ' matching your filters' : ''}.`);
  };

  // ── Permission ─────────────────────────────────────────────────────────────

  if (!canView) {
    return (
      <div className={ADMIN_PAGE_CLASS}>
        <AdminHeader eyebrow={null} title="Gradebook" />
        <AdminCard>
          <StateBlock icon={<LockOutlined />} title="Grades are not available" text="Your account doesn’t have permission to view grades. Contact your institution admin if you think this is a mistake." />
        </AdminCard>
      </div>
    );
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────

  const departments = Array.from(new Set(courses.map(c => c.departmentName).filter((d): d is string => !!d))).sort();
  const institutionsInData = Array.from(new Set(courses.map(c => c.institutionId).filter(Boolean)))
    .filter(id => institutionNames[id])
    .map(id => ({ value: id, label: institutionNames[id] }))
    .sort((x, y) => x.label.localeCompare(y.label));
  const courseOptions = courses
    .filter(c => (!deptFilter || c.departmentName === deptFilter) && (!institutionFilter || c.institutionId === institutionFilter))
    .map(c => ({ value: c.id, label: c.title }));
  const typeOptions = typeFilterOptions(rows);

  const filterSelect = (
    label: string, placeholder: string, value: string | undefined, onChange: (v: string | undefined) => void,
    options: { value: string; label: string }[], searchable = false,
  ) => (
    <ToolbarFilter key={label}>
      <Select
        placeholder={placeholder}
        aria-label={label}
        allowClear
        showSearch={searchable}
        optionFilterProp="label"
        style={{ width: '100%' }}
        value={value}
        onChange={onChange}
        options={options}
      />
    </ToolbarFilter>
  );

  const toolbar = (
    <Toolbar
      search={
        <Input
          placeholder={copy.search}
          aria-label="Search grades"
          prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      }
      filters={
        <>
          {role === 'platform' && institutionsInData.length > 1 &&
            filterSelect('Filter by institution', 'All institutions', institutionFilter, v => { setInstitutionFilter(v); setCourseFilter(undefined); }, institutionsInData, true)}
          {(role === 'institution' || role === 'department') && departments.length > 1 &&
            filterSelect('Filter by department', 'All departments', deptFilter, v => { setDeptFilter(v); setCourseFilter(undefined); }, departments.map(d => ({ value: d, label: d })), true)}
          {courses.length > 1 && filterSelect('Filter by course', 'All courses', courseFilter, setCourseFilter, courseOptions, true)}
          {typeOptions.length > 1 && filterSelect('Filter by type', 'All types', typeFilter, setTypeFilter, typeOptions)}
          {filterSelect('Filter by status', 'All statuses', statusFilter, setStatusFilter, statusFilterOptions(forStudent))}
          {hasFilters && <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>Clear filters</Button>}
        </>
      }
      end={
        <>
          {!isLoading && !loadError && <ResultCount total={filteredRows.length} noun={forStudent ? 'grade' : 'record'} />}
          {!forStudent && (
            <Tooltip title={filteredRows.length ? `Exports the ${plural(filteredRows.length, 'row')} ${hasFilters ? 'matching your filters' : 'in this view'}.` : 'Nothing to export'}>
              <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={isLoading || !filteredRows.length}>Export CSV</Button>
            </Tooltip>
          )}
        </>
      }
    />
  );

  // ── Records body: error · empty · no-match · table + mobile list ───────────

  const emptyState = hasFilters && rows.length > 0 ? (
    <StateBlock
      kind="no-match"
      title="No results match your filters"
      text="Try a different search, or clear the filters to see every record."
      actions={<Button onClick={clearFilters}>Clear filters</Button>}
    />
  ) : (
    <StateBlock
      icon={<FileTextOutlined />}
      title={copy.emptyTitle}
      text={copy.emptyText}
      actions={<Link href="/courses"><Button type={forStudent ? 'primary' : 'default'}>{forStudent ? 'Go to Courses' : 'View Courses'}</Button></Link>}
    />
  );

  const recordsBody = loadError ? (
    <LoadErrorState
      title="Could not load gradebook"
      text="Gradebook data could not be loaded. Try again or refresh the page."
      onRetry={retry}
    />
  ) : !isLoading && filteredRows.length === 0 ? emptyState : (
    <>
      {failedCourses > 0 && !isLoading && (
        <div className={g.partial} role="status">
          Grades for {plural(failedCourses, 'course')} could not be loaded, so this list may be incomplete.{' '}
          <Button type="link" size="small" onClick={retry} style={{ padding: 0, height: 'auto' }}>Retry</Button>
        </div>
      )}
      <div className={a.desktopOnly}>
        <Table<GradeRow>
          dataSource={filteredRows}
          columns={columns}
          rowKey="key"
          size="middle"
          loading={isLoading}
          pagination={filteredRows.length > 20 ? { pageSize: 20, showSizeChanger: false, showTotal: (t, [s, e]) => `Showing ${s}–${e} of ${t}` } : false}
          scroll={{ x: tableMinWidth }}
          locale={{ emptyText: ' ' }}
          onRow={(row) => {
            const href = forStudent ? reviewHref(row) : null;
            return href ? { onClick: (e) => { if (!(e.target as HTMLElement).closest('button,a')) router.push(href); }, style: { cursor: 'pointer' } } : {};
          }}
        />
      </div>
      <ul className={a.mobileList} aria-label={copy.recordsTitle}>
        {isLoading && <li className={a.mobileItem} style={{ textAlign: 'center' }}><Spin /></li>}
        {!isLoading && filteredRows.slice(0, mobileLimit).map(r => (
          <li key={r.key} className={a.mobileItem}>
            <div className={a.mobileItemHead}>
              <span className={a.cellTitle} style={{ fontSize: 14 }}>{r.itemTitle}</span>
              <GradeStatusChip row={r} forStudent={forStudent} />
            </div>
            <div className={a.mobileMeta}>
              {[!forStudent && r.studentName, role === 'platform' && institutionName(r.institutionId), r.courseTitle].filter(Boolean).join(' · ')}
            </div>
            <div className={a.mobileMeta} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 }}>
              <GradeTypeChip type={r.itemType} />
              <span>{r.score != null ? `${r.score} / ${r.maxPoints} · ${Math.round(r.percentage ?? 0)}%` : 'No score yet'}</span>
              {r.gradedAt && <span>· {formatWhen(r.gradedAt)}</span>}
            </div>
            <div className={a.mobileActions}>{renderActions(r)}</div>
          </li>
        ))}
        {!isLoading && filteredRows.length > mobileLimit && (
          <li className={g.mobileMore}>
            <Button block onClick={showMoreMobile}>
              Show more ({filteredRows.length - mobileLimit} remaining)
            </Button>
          </li>
        )}
      </ul>
    </>
  );

  // ── Role sections ──────────────────────────────────────────────────────────

  const showOverview = !loadError && !isLoading && rows.length > 0;

  const studentCourseOverview = forStudent && showOverview && courseSummaries.length > 0 && (
    <AdminCard title="Course grades" icon={<BookOutlined />} helper="Your overall grade and graded work in each course" flush>
      <ul className={g.courseGrid}>
        {courseSummaries.map(s => (
          <li key={s.course.id} className={g.courseCard} data-active={courseFilter === s.course.id}>
            <div className={g.courseHead}>
              <h3 className={g.courseTitle}>{s.course.title}</h3>
              <div className={g.courseGrade}>
                <span className={g.courseGradeValue}>{s.grade != null ? `${s.grade}%` : '—'}</span>
                <span className={g.courseGradeLabel}>{s.gradeIsWeighted ? 'Course grade' : 'Average'}</span>
              </div>
            </div>
            <ProgressBar percent={s.total ? (s.graded / s.total) * 100 : 0} label={`${s.graded} of ${s.total} graded`} />
            <div className={g.courseFacts}>
              <Chip tone={s.pending ? 'neutral' : 'success'}>{s.pending ? `${s.pending} pending` : 'Nothing pending'}</Chip>
              {s.missing > 0 && <Chip tone="error">{s.missing} missing</Chip>}
            </div>
            <p className={g.courseLatest}>
              {s.latest
                ? <>Latest: <strong>{s.latest.itemTitle}</strong> · {formatWhen(s.latest.gradedAt)}</>
                : 'No graded activity yet'}
            </p>
            <div className={g.courseActions}>
              <Button size="small" onClick={() => focusCourse(s.course.id)}>View Course Grades</Button>
              <Link href={activityHref(s.course.id)}><Button size="small" type="link" style={{ paddingInline: 4 }}>Open course</Button></Link>
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  );

  const needsGradingSection = role === 'instructor' && showOverview && needsGrading.length > 0 && (
    <AdminCard
      title="Needs grading"
      icon={<ClockCircleOutlined />}
      helper={`${plural(needsGrading.length, 'submission')} recorded without a score`}
      flush
    >
      <ul className={g.queue}>
        {needsGrading.slice(0, 5).map(r => {
          const review = reviewHref(r);
          return (
            <li key={r.key} className={g.queueItem}>
              <div className={g.queueMain}>
                <p className={g.queueTitle}>{r.studentName} <GradeTypeChip type={r.itemType} /></p>
                <p className={g.queueMeta}>{r.itemTitle} · {r.courseTitle}{r.gradedAt ? ` · Recorded ${formatWhen(r.gradedAt)}` : ''}</p>
              </div>
              <Space size={6} wrap>
                {review && <Link href={review}><Button size="small" icon={<FileSearchOutlined />}>Review</Button></Link>}
                {canEditGrades && <Button size="small" icon={<AuditOutlined />} onClick={() => setOverrideRow(r)}>Grade</Button>}
              </Space>
            </li>
          );
        })}
      </ul>
      {needsGrading.length > 5 && (
        <div className={g.queueMore}>
          <Button type="link" style={{ padding: 0 }} onClick={() => { setStatusFilter('needs_review'); document.getElementById(RECORDS_ID)?.scrollIntoView({ behavior: 'smooth' }); }}>
            Show all {needsGrading.length} in the table
          </Button>
        </div>
      )}
    </AdminCard>
  );

  const coursePerformance = (role === 'institution' || role === 'department') && showOverview && courseSummaries.length > 0 && (
    <AdminCard title="Course performance" icon={<LineChartOutlined />} helper="Grading activity and average score per course" flush>
      <div className={a.desktopOnly}>
        <Table
          dataSource={courseSummaries}
          rowKey={s => s.course.id}
          size="middle"
          pagination={courseSummaries.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
          scroll={{ x: 820 }}
          columns={[
            {
              title: 'Course', key: 'course',
              render: (_: unknown, s: (typeof courseSummaries)[number]) => (
                <>
                  <span className={a.cellTitle} style={{ fontSize: 13 }}>{s.course.title}</span>
                  {(s.course.code || s.course.departmentName) && (
                    <span className={a.cellSub}>{[s.course.code, s.course.departmentName].filter(Boolean).join(' · ')}</span>
                  )}
                </>
              ),
            },
            {
              title: 'Students', key: 'students', align: 'right', width: 100,
              render: (_: unknown, s: (typeof courseSummaries)[number]) => <span className={a.numeric}>{s.students ?? '—'}</span>,
            },
            {
              title: 'Graded', key: 'graded', width: 170,
              render: (_: unknown, s: (typeof courseSummaries)[number]) => s.total
                ? <ProgressBar percent={(s.graded / s.total) * 100} label={`${s.graded} / ${s.total}`} />
                : <span className={a.muted}>No assessments</span>,
            },
            {
              title: 'Pending grading', key: 'pending', align: 'right', width: 130,
              render: (_: unknown, s: (typeof courseSummaries)[number]) => s.needsReview
                ? <Chip tone="warning">{s.needsReview}</Chip>
                : <span className={a.muted}>0</span>,
            },
            {
              title: 'Missing', key: 'missing', align: 'right', width: 100,
              render: (_: unknown, s: (typeof courseSummaries)[number]) => s.missing
                ? <Chip tone="error">{s.missing}</Chip>
                : <span className={a.muted}>0</span>,
            },
            {
              title: 'Avg. score', key: 'avg', align: 'right', width: 100,
              render: (_: unknown, s: (typeof courseSummaries)[number]) => <PercentCell pct={s.grade} />,
            },
            {
              title: 'Actions', key: 'actions', align: 'right', width: 130,
              render: (_: unknown, s: (typeof courseSummaries)[number]) => (
                <Button size="small" onClick={() => focusCourse(s.course.id)}>View Details</Button>
              ),
            },
          ]}
        />
      </div>
      <ul className={a.mobileList}>
        {courseSummaries.map(s => (
          <li key={s.course.id} className={a.mobileItem}>
            <div className={a.mobileItemHead}>
              <span className={a.cellTitle} style={{ fontSize: 14 }}>{s.course.title}</span>
              <PercentCell pct={s.grade} />
            </div>
            <div className={a.mobileMeta}>
              {[s.students != null && plural(s.students, 'student'), `${s.graded} / ${s.total} graded`, s.needsReview && `${s.needsReview} pending`, s.missing && `${s.missing} missing`].filter(Boolean).join(' · ')}
            </div>
            <div className={a.mobileActions}>
              <Button size="small" onClick={() => focusCourse(s.course.id)}>View Details</Button>
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  );

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        eyebrow={role === 'student' || role === 'instructor' ? null : undefined}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      {!loadError && <KpiRow items={kpis} loading={isLoading} />}

      {needsGradingSection}
      {studentCourseOverview}
      {coursePerformance}

      <AdminCard id={RECORDS_ID} title={copy.recordsTitle} flush toolbar={toolbar}>
        {recordsBody}
      </AdminCard>

      <OverrideModal
        open={!!overrideRow}
        row={overrideRow}
        courseId={overrideRow?.courseId ?? ''}
        onClose={() => setOverrideRow(null)}
        onSaved={() => loadInstructorView()}
      />
    </div>
  );
}

'use client';

/**
 * Student Dashboard — route /dashboard/student.
 * Order of attention: a light welcome line → "Continue where you left off" (the
 * page's one primary action) → four key stats → courses + to-do (main column)
 * and a quiet rail (semester progress, shortcuts, updates).
 */

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRoleRouteGuard } from '@/hooks/useRoleRouteGuard';
import { getStudentDashboard, type StudentDashboard } from '@/lib/dashboard';
import { scopeToContext } from '@/components/dashboard/DashboardHeader';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';
import DashboardEmptyState from '@/components/dashboard/DashboardEmptyState';
import {
  Chip, DueChip, ProgressBar, StateChip, dueStatus, formatDate, learningState, learningStyles as s,
  type LearningState,
} from '@/components/student/studentUi';
import type { StudentCourseRow } from '@/types';
import { Row, Col, Button } from 'antd';
import {
  BookOutlined, FileTextOutlined, ExperimentOutlined, TrophyOutlined, FormOutlined,
  PlayCircleOutlined, BellOutlined, MailOutlined, RightOutlined, BarChartOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import styles from '@/components/layout/BedoAppSkin.module.css';

type DueQuiz = StudentDashboard['sections']['myToDo']['quizzesDue'][number];

const COURSE_ACTION: Record<LearningState, string> = {
  not_started: 'Start Course',
  in_progress: 'Continue Course',
  completed: 'Review Course',
};

/** Overdue first, then soonest due; items without a due date go last. */
function sortByDue(items: DueQuiz[]): DueQuiz[] {
  return [...items].sort((a, b) => {
    if (!a.dueAt) return b.dueAt ? 1 : 0;
    if (!b.dueAt) return -1;
    return Date.parse(a.dueAt) - Date.parse(b.dueAt);
  });
}

/** The single course to surface in "Continue where you left off" (section 19.3 — at most one). */
function pickFocusCourse(courses: StudentCourseRow[], dueSorted: DueQuiz[]): StudentCourseRow | null {
  const byState = (st: LearningState) => courses.filter((c) => learningState(c.progressPercentage) === st);
  const inProgress = byState('in_progress');
  if (inProgress.length) {
    // Prefer the in-progress course with the earliest due item, then the furthest along.
    const withDue = dueSorted.map((q) => inProgress.find((c) => c.id === q.courseId)).find(Boolean);
    return withDue ?? [...inProgress].sort((a, b) => (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0))[0];
  }
  return byState('not_started')[0] ?? null;
}

/** One row in the rail's Updates card. */
function UpdateRow({ icon, label, count, href, action }: { icon: ReactNode; label: string; count: number; href: string; action: string }) {
  return (
    <li className={s.updateRow}>
      <span className={s.updateIcon} aria-hidden>{icon}</span>
      <span className={s.updateText}>
        <strong>{label}</strong>
        <span>{count > 0 ? `${count} unread` : 'All caught up'}</span>
      </span>
      <Link href={href} className={s.railLink}>{action}</Link>
    </li>
  );
}

export default function StudentDashboardPage() {
  const allowed = useRoleRouteGuard('student');
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getStudentDashboard()
      .then(setData)
      .catch(() => setError('Failed to load your dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;
  if (loading && !data) return <div className={styles.root}><DashboardSkeleton /></div>;
  if (error) return <div className={styles.root}><DashboardErrorState message={error} onRetry={load} /></div>;
  if (!data || !user) return null;

  const { kpis, sections, scope } = data;
  const hasCurrentTerm = !!scope.semester_term_id;
  const courses = sections.myCourses;
  const dueSorted = sortByDue(sections.myToDo.quizzesDue);
  const focus = pickFocusCourse(courses, dueSorted);
  const focusState = focus ? learningState(focus.progressPercentage) : null;
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title;
  /** Earliest due item for a course — the dashboard's only "next" data (no extra requests). */
  const nextDue = (courseId: string) => dueSorted.find((q) => q.courseId === courseId);
  const focusNextDue = focus ? nextDue(focus.id) : undefined;
  const context = scopeToContext(scope);
  const scopeLine = [context.institutionName, context.departmentName, context.academicYearName, context.semesterTermName]
    .filter(Boolean).join(' · ');

  // The four numbers that answer "how am I doing?"; the rest moves to the rail.
  const stats = [
    { key: 'courses', label: 'Active Courses', value: kpis.currentCourses, icon: <BookOutlined />, color: 'var(--sl-secondary)' },
    { key: 'pending', label: 'Pending Activities', value: kpis.pendingLessons, icon: <FileTextOutlined />, color: 'var(--sl-secondary)' },
    // Red only when something is actually due (section 18.6).
    { key: 'quizzesDue', label: 'Quizzes Due', value: kpis.quizzesDue, icon: <FormOutlined />, color: kpis.quizzesDue > 0 ? 'var(--sl-error)' : 'var(--sl-success)' },
    {
      key: 'avgGrade', label: 'Average Grade',
      value: kpis.averageGrade != null ? Math.round(kpis.averageGrade) : '—',
      unit: kpis.averageGrade != null ? '%' : undefined, icon: <TrophyOutlined />, color: 'var(--sl-success)',
    },
  ];

  return (
    <div className={`${styles.root} ${s.page}`}>
      {/* Welcome — a light heading, not a card */}
      <header className={s.dashWelcome}>
        <h1 className={s.title}>Welcome back, {user.firstName}</h1>
        {scopeLine && <p className={s.sectionIntro}>{scopeLine}</p>}
      </header>

      {!hasCurrentTerm ? (
        <div className={styles.panel}>
          <DashboardEmptyState
            description="You don't have a current semester term assignment yet. Contact your department manager or institution admin."
          />
        </div>
      ) : (
        <>
          {/* Continue where you left off — the one primary action on the page */}
          {focus && focusState && (
            <section className={`${s.panel} ${s.continueCard} ${s.continueCardCompact}`} aria-labelledby="continue-learning">
              <div className={s.continueIcon} aria-hidden><PlayCircleOutlined /></div>
              <div style={{ minWidth: 0 }}>
                <span className={s.eyebrow} id="continue-learning">
                  {focusState === 'not_started' ? 'Your next learning step' : 'Continue where you left off'}
                </span>
                <h2 className={s.continueTitle}>{focus.title}</h2>
                <ProgressBar
                  className={s.continueProgress}
                  percent={focus.progressPercentage ?? 0}
                  label={focusState === 'not_started' ? 'Not started' : `${Math.round(focus.progressPercentage ?? 0)}% complete`}
                />
                {focusNextDue && (
                  <div className={s.continueNext}>
                    <span>Next: <strong>{focusNextDue.title}</strong></span>
                    <DueChip dueAt={focusNextDue.dueAt} />
                  </div>
                )}
              </div>
              <div className={s.continueAction}>
                <Button
                  type="primary" size="large" icon={<PlayCircleOutlined />}
                  onClick={() => router.push(`/courses/${focus.id}/home`)}
                >
                  {COURSE_ACTION[focusState]}
                </Button>
              </div>
            </section>
          )}

          {/* Four key stats — supporting context, quieter than the card above */}
          <div className={`${s.panel} ${s.statStrip} ${s.statStripFour}`} role="list" aria-label="Your progress at a glance">
            {stats.map((st) => (
              <div key={st.key} className={s.stat} role="listitem">
                <span className={s.statIcon} style={{ color: st.color }} aria-hidden>{st.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <span className={s.statValue}>
                    {st.value ?? '—'}{st.unit && <span className={s.statUnit}>{st.unit}</span>}
                  </span>
                  <span className={s.statLabel}>{st.label}</span>
                </div>
              </div>
            ))}
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              {/* Current courses */}
              <section className={s.panel} style={{ marginBottom: 16 }} aria-labelledby="current-courses">
                <div className={s.sectionHead}>
                  <div>
                    <h3 className={s.sectionTitle} id="current-courses">My Simulation Courses</h3>
                    <span className={s.sectionHelper}>Courses you are enrolled in</span>
                  </div>
                  <Link href="/courses"><Button type="link" size="small" style={{ padding: 0 }}>View all courses</Button></Link>
                </div>
                {courses.length === 0 ? (
                  <p className={s.emptyNote}>You are not enrolled in any active courses yet.</p>
                ) : (
                  <ul className={s.list}>
                    {courses.map((c) => {
                      const st = learningState(c.progressPercentage);
                      const pct = Math.round(c.progressPercentage ?? 0);
                      const next = nextDue(c.id);
                      return (
                        <li key={c.id} className={s.courseRow}>
                          <div style={{ minWidth: 0 }}>
                            <p className={s.rowTitle}>{c.title}</p>
                            <div className={s.metaRow} style={{ marginTop: 4 }}>
                              <StateChip state={st} />
                            </div>
                            {next && (
                              <span className={s.rowNext} title={`Next due: ${next.title}`}>
                                <span className={s.factLead}>Next due:</span> <strong>{next.title}</strong>
                              </span>
                            )}
                          </div>
                          <ProgressBar percent={pct} label={st === 'not_started' ? 'Not started' : `${pct}%`} />
                          <div>
                            <span className={s.gradeValue}>{c.latestGrade != null ? `${Math.round(c.latestGrade)}%` : '—'}</span>
                            <span className={s.gradeLabel}>{c.latestGrade != null ? 'Current grade' : 'No grade yet'}</span>
                          </div>
                          <Button
                            color="primary" variant="outlined" icon={<PlayCircleOutlined />}
                            className={s.rowAction}
                            onClick={() => router.push(`/courses/${c.id}/home`)}
                          >
                            {COURSE_ACTION[st]}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* To-do */}
              <section className={s.panel} style={{ marginBottom: 16 }} aria-labelledby="my-todo">
                <div className={s.sectionHead}>
                  <div>
                    <h3 className={s.sectionTitle} id="my-todo">My To-Do</h3>
                    <span className={s.sectionHelper}>Sorted by due date</span>
                  </div>
                  {sections.myToDo.pendingLessons > 0 && (
                    <span className={s.sectionHelper}>{sections.myToDo.pendingLessons} activities remaining this semester</span>
                  )}
                </div>
                {dueSorted.length === 0 ? (
                  <p className={s.emptyNote}>Nothing due right now.</p>
                ) : (
                  <ul className={s.list}>
                    {dueSorted.map((q) => {
                      const due = dueStatus(q.dueAt);
                      return (
                        <li key={q.id} className={s.todoRow}>
                          <span className={s.todoIcon} aria-hidden><FormOutlined /></span>
                          <div style={{ minWidth: 0 }}>
                            <p className={s.rowTitle}>{q.title}</p>
                            <div className={s.todoMeta}>
                              {courseTitle(q.courseId) && <span className={s.todoCourse}>{courseTitle(q.courseId)}</span>}
                              <Chip tone="neutral" className={s.chipSm} icon={<FormOutlined />}>Quiz</Chip>
                            </div>
                          </div>
                          {/* Due column: soon/overdue as a soft chip, later dates as plain text. */}
                          <div className={s.todoDue}>
                            {due.tone === 'neutral'
                              ? <span className={s.todoDueLater}>{due.label}</span>
                              : <Chip tone={due.tone} className={s.chipSm} icon={<ClockCircleOutlined />}>{due.label}</Chip>}
                            {q.dueAt && <span className={s.todoDueTime}>{formatDate(q.dueAt, true)}</span>}
                          </div>
                          {/* The dashboard only knows the quiz id; the workspace resolves ?quiz= to its activity. */}
                          <Button size="small" onClick={() => router.push(`/courses/${q.courseId}/home?quiz=${encodeURIComponent(q.id)}`)}>Take Quiz</Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </Col>

            {/* Rail — supporting information only */}
            <Col xs={24} lg={8}>
              <div className={s.rail}>
                <section className={`${s.panel} ${s.railCard}`} aria-labelledby="semester-progress">
                  <h3 className={s.railTitle} id="semester-progress">This Semester</h3>
                  <dl className={s.railList} style={{ marginTop: 0 }}>
                    <dt>Completed activities</dt><dd>{kpis.completedLessons}</dd>
                    <dt>Simulation time</dt><dd>{Math.round(kpis.simulationTimeSeconds / 60)} min</dd>
                    <dt>Quiz attempts</dt><dd>{kpis.quizAttempts}</dd>
                  </dl>
                </section>

                {/* Shortcuts that add something the sidebar doesn't: resume + two common destinations. */}
                <section className={`${s.panel} ${s.railCard}`} aria-labelledby="shortcuts">
                  <h3 className={s.railTitle} id="shortcuts">Shortcuts</h3>
                  <ul className={s.shortcutList}>
                    {focus && (
                      <li>
                        <Link href={`/courses/${focus.id}/home`} className={s.shortcut}>
                          <PlayCircleOutlined aria-hidden />
                          <span className={s.shortcutLabel}>Resume {focus.title}</span>
                          <RightOutlined aria-hidden className={s.shortcutChevron} />
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link href="/simulations" className={s.shortcut}>
                        <ExperimentOutlined aria-hidden />
                        <span className={s.shortcutLabel}>Browse simulations</span>
                        <RightOutlined aria-hidden className={s.shortcutChevron} />
                      </Link>
                    </li>
                    <li>
                      <Link href="/gradebook" className={s.shortcut}>
                        <BarChartOutlined aria-hidden />
                        <span className={s.shortcutLabel}>View gradebook</span>
                        <RightOutlined aria-hidden className={s.shortcutChevron} />
                      </Link>
                    </li>
                  </ul>
                </section>

                {/* Notifications + messages in one small card */}
                <section className={`${s.panel} ${s.railCard}`} aria-labelledby="updates">
                  <h3 className={s.railTitle} id="updates">Updates</h3>
                  <ul className={s.updateList}>
                    <UpdateRow icon={<BellOutlined />} label="Notifications" count={data.notifications.unread} href="/notifications" action="View all" />
                    <UpdateRow icon={<MailOutlined />} label="Messages" count={data.messages.unread} href="/mail" action="Open mail" />
                  </ul>
                </section>
              </div>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

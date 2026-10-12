/**
 * DEV ONLY — mock API fallback for previewing the UI (student, instructor and admin
 * dashboards) without the backend.
 *
 * lib/api.ts calls devMockRequest() only when NEXT_PUBLIC_DEV_MOCK_AUTH=true in a
 * non-production build. The real request is always tried first; if it fails
 * (backend down, timeout, 401 because the mock session has no token, …) and a mock
 * route below matches, the mock response is returned instead. Unmatched routes
 * behave exactly as they would without mock mode.
 *
 * To remove: delete this file, lib/devMockData.ts and lib/devMock.ts, then the
 * lines marked "DEV ONLY" in lib/api.ts, context/AuthContext.tsx and proxy.ts.
 */

import type { ApiError, ApiSuccess, PaginationMeta } from '@/types/api';
import type {
  Course, Enrollment, Grade, GradeItem, GradebookResponse, MailFolder, MailListItem, MailMessageDetail, QuizAttempt,
  StudentGradesResponse, User,
} from '@/types';
import type {
  StudentDashboard, TeachingDashboard, PlatformDashboard, InstitutionDashboard, DepartmentDashboard,
} from './dashboard';
import {
  MOCK_STUDENT_USER, MOCK_INSTRUCTOR_USER, MOCK_SUPER_ADMIN_USER, MOCK_INSTITUTION_ADMIN_USER, MOCK_DEPT_MANAGER_USER,
  getDevMockUser,
} from './devMock';
import {
  COURSES, ENROLLMENTS, SIMULATIONS, CATALOG_TREE, QUIZZES, ATTEMPTS, NOTIFICATIONS, MAILS, PEOPLE, MOCK_ME,
  ACTIVITY_SESSIONS, COMPLETED_LESSONS, PARTICIPATION_SCORES, STUDENT_ID, INSTITUTION_ID, DEPARTMENT_ID,
  courseById, simById, quizById, questionsFor, gradeResponse, buildJourney, buildCourseTree,
  catalogSubtreeIds, latestSessionForLesson, bestAttempt, simLabScore, daysFromNow, type MockMail,
} from './devMockData';

type Query = Record<string, unknown> | undefined;
type Body = Record<string, unknown> | undefined;
interface Ctx { p: Record<string, string>; q: Query; body: Body }
type Handler = (ctx: Ctx) => ApiSuccess<unknown>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const ok = <T>(data: T, meta?: PaginationMeta): ApiSuccess<T> => ({ success: true, message: 'OK (dev mock)', data, meta });

const fail = (status: number, title: string, detail?: string): ApiError => ({ type: 'about:blank', status, title, detail });

function paginate<T>(rows: T[], q: Query): { page: T[]; meta: PaginationMeta } {
  const limit = Math.max(1, Number(q?.limit ?? 20));
  const page = Math.max(1, Number(q?.page ?? 1));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page: rows.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

const matches = (needle: unknown, ...hay: (string | null | undefined)[]) =>
  !needle || hay.some((h) => h?.toLowerCase().includes(String(needle).toLowerCase()));

function requireCourse(id: string): Course {
  const c = courseById(id);
  if (!c) throw fail(404, 'Course not found');
  return c;
}

function requireAttempt(id: string): QuizAttempt {
  const a = ATTEMPTS.find((x) => x.id === id);
  if (!a) throw fail(404, 'Attempt not found');
  return a;
}

function requireMail(id: string): MockMail {
  const m = MAILS.find((x) => x.id === id);
  if (!m) throw fail(404, 'Message not found');
  return m;
}

/** Actively-enrolled courses — mirrors CourseModel.listEnrolledByUser (status = 'active'). */
const myCourses = () => COURSES.filter((c) => ENROLLMENTS.get(c.id)?.status === 'active');

// ── Mail mapping ─────────────────────────────────────────────────────────────

const name = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`;
const ref = (u: { id: string; firstName: string; lastName: string }) => ({ userId: u.id, firstName: u.firstName, lastName: u.lastName });

function toListItem(m: MockMail): MailListItem {
  return {
    id: m.id, threadId: m.threadId, senderId: m.from.id, senderName: name(m.from), subject: m.subject,
    bodyPreview: m.body.replace(/\s+/g, ' ').slice(0, 120), messageType: m.messageType ?? 'normal',
    hasAttachments: !!m.attachments?.length, attachmentCount: m.attachments?.length ?? 0,
    courseId: m.courseId ?? null, courseTitle: m.courseId ? courseById(m.courseId)?.title ?? null : null,
    isRead: m.isRead, folder: m.folder, recipientType: m.from.id === STUDENT_ID ? null : 'to',
    sentAt: m.folder === 'draft' ? null : m.at, createdAt: m.at,
    recipients: m.from.id === STUDENT_ID ? m.to.map(name) : undefined,
  };
}

function toDetail(m: MockMail): MailMessageDetail {
  const isSender = m.from.id === STUDENT_ID;
  return {
    id: m.id, threadId: m.threadId, subject: m.subject, body: m.body, messageType: m.messageType ?? 'normal',
    attachments: m.attachments ?? [], courseId: m.courseId ?? null,
    courseTitle: m.courseId ? courseById(m.courseId)?.title ?? null : null, parentMessageId: null,
    sentAt: m.folder === 'draft' ? null : m.at, createdAt: m.at,
    sender: { id: m.from.id, firstName: m.from.firstName, lastName: m.from.lastName },
    to: m.to.map(ref), cc: (m.cc ?? []).map(ref), bcc: isSender ? [] : undefined,
    folder: m.folder, isRead: m.isRead, isSender, thread: m.history ?? [],
  };
}

const FOLDER_BY_PATH: Record<string, MailFolder> = { inbox: 'inbox', sent: 'sent', drafts: 'draft', archived: 'archived', trash: 'trash' };

function people(ids: unknown) {
  const all = Object.values(PEOPLE);
  return ((ids as string[]) ?? []).map((id) => all.find((p) => p.id === id)).filter((p): p is (typeof all)[number] => !!p);
}

function newMail(body: Body, folder: MailFolder, extra: Partial<MockMail> = {}): MockMail {
  const id = `dev-mail-${Date.now()}`;
  const m: MockMail = {
    id, threadId: `dev-thread-${id}`, from: MOCK_ME, to: people(body?.to), cc: people(body?.cc),
    subject: String(body?.subject ?? '(no subject)'), body: String(body?.body ?? ''),
    courseId: (body?.courseId as string) || undefined, folder, isRead: true, at: new Date().toISOString(), ...extra,
  };
  MAILS.unshift(m);
  return m;
}

// ── Gradebook ────────────────────────────────────────────────────────────────

function studentGrades(courseId: string): StudentGradesResponse {
  const journey = buildJourney(courseId);
  const rows: StudentGradesResponse['grades'] = [];
  const add = (item: GradeItem, score: number | null, extra: Partial<Grade> = {}) => rows.push({
    item,
    grade: score == null ? null : {
      id: `dev-grade-${item.id}`, gradeItemId: item.id, userId: STUDENT_ID, score, pointsPossible: item.maxPoints,
      isOverride: false, gradedAt: daysFromNow(-2), institutionId: INSTITUTION_ID, ...extra,
    },
  });

  for (const q of QUIZZES.filter((x) => x.courseId === courseId)) {
    const best = bestAttempt(q.id);
    add({ id: `dev-gi-${q.id}`, courseId, title: q.title, itemType: 'quiz', quizId: q.id, maxPoints: q.pointsPossible, weight: 1, dueDate: q.dueAt },
      best?.finalScore ?? null, { quizAttemptId: best?.id ?? null, gradedAt: best?.gradedAt ?? null });
  }
  for (const m of journey?.modules ?? []) {
    for (const l of m.lessons.filter((x) => x.simulationId)) {
      add({ id: `dev-gi-${l.id}`, courseId, title: `Lab — ${l.simulation?.title ?? l.title}`, itemType: 'simulation', lessonId: l.id, simulationId: l.simulationId, maxPoints: 100, weight: 1 },
        l.completionStatus === 'completed' ? simLabScore(l.id) : null);
    }
  }
  add({ id: `dev-gi-${courseId}-participation`, courseId, title: 'Participation', itemType: 'participation', maxPoints: 10, weight: 0.5 },
    PARTICIPATION_SCORES[courseId] ?? null);

  const graded = rows.filter((r) => r.grade?.score != null);
  const weightedPct = graded.length
    ? Math.round(graded.reduce((s, r) => s + (r.grade!.score! / r.item.maxPoints) * 100, 0) / graded.length * 10) / 10
    : null;
  return { studentId: STUDENT_ID, courseId, weightedPct, grades: rows };
}

/** Course gradebook for staff: the demo student's items, with a small deterministic class. */
const CLASS_LIST = [
  { id: STUDENT_ID, firstName: 'Demo', lastName: 'Student', email: 'student@dev.local' },
  { id: 'dev-stu-02', firstName: 'Laila', lastName: 'Farouk', email: 'laila.farouk@demo.edu' },
  { id: 'dev-stu-03', firstName: 'Youssef', lastName: 'Kamal', email: 'youssef.kamal@demo.edu' },
  { id: 'dev-stu-04', firstName: 'Nour', lastName: 'Saeed', email: 'nour.saeed@demo.edu' },
  { id: 'dev-stu-05', firstName: 'Hana', lastName: 'Ibrahim', email: 'hana.ibrahim@demo.edu' },
  { id: 'dev-stu-06', firstName: 'Tarek', lastName: 'Mansour', email: 'tarek.mansour@demo.edu' },
];

function courseGradebook(courseId: string): GradebookResponse {
  const own = studentGrades(courseId);
  const items = own.grades.map((g) => ({ ...g.item, maxPoints: g.item.maxPoints }));
  const grid: GradebookResponse['grid'] = {};
  CLASS_LIST.forEach((s, si) => {
    grid[s.id] = {};
    items.forEach((item, ii) => {
      const mine = si === 0 ? own.grades[ii].grade : null;
      const seed = (si * 7 + ii * 3) % 10;
      if (si === 0 && !mine) return;
      if (si !== 0 && seed >= 8) return;                       // not submitted / missing
      const recordedOnly = si !== 0 && seed === 7;               // recorded without a score
      const score = mine?.score ?? (recordedOnly ? null : Math.round(item.maxPoints * (0.35 + seed * 0.07)));
      grid[s.id][item.id] = {
        id: mine?.id ?? `dev-grade-${s.id}-${item.id}`,
        score, pointsPossible: item.maxPoints, isOverride: false,
        gradedAt: mine?.gradedAt ?? daysFromNow(-(seed + 1)),
        quizAttemptId: mine?.quizAttemptId ?? null,
        simulationScoreId: mine?.simulationScoreId ?? null,
      };
    });
  });
  return { items, students: CLASS_LIST, grid };
}

// ── Student dashboard (derived, so it stays consistent with the pages) ───────

function studentDashboard(): StudentDashboard {
  // Current term only, like the real dashboard service.
  const current = COURSES.filter((c) => ENROLLMENTS.get(c.id)?.status === 'active' && c.semesterTermId === 'dev-term-0001');
  const journeys = current.map((c) => buildJourney(c.id)!);
  const completedLessons = journeys.reduce((s, j) => s + j.progress.completedLessons, 0);
  const pendingLessons = journeys.reduce((s, j) => s + j.progress.totalLessons - j.progress.completedLessons, 0);
  const quizzesDue = QUIZZES.filter((q) =>
    current.some((c) => c.id === q.courseId) && q.dueAt && Date.parse(q.dueAt) > Date.now() && !bestAttempt(q.id),
  ).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
  const graded = ATTEMPTS.filter((a) => a.status === 'graded' && a.percentage != null);
  const averageGrade = graded.length ? Math.round(graded.reduce((s, a) => s + a.percentage!, 0) / graded.length * 10) / 10 : null;
  const simSeconds = ACTIVITY_SESSIONS.reduce((s, x) => s + x.durationSeconds, 0);
  const unreadMessages = MAILS.filter((m) => m.folder === 'inbox' && !m.isRead).length;
  const unreadNotifications = NOTIFICATIONS.filter((n) => n.status === 'unread').length;
  const latestGrade = (courseId: string) =>
    ATTEMPTS.filter((a) => a.courseId === courseId && a.status === 'graded')
      .sort((a, b) => Date.parse(b.submittedAt ?? '') - Date.parse(a.submittedAt ?? ''))[0]?.percentage ?? null;

  const recent = [
    ...ATTEMPTS.filter((a) => a.submittedAt).map((a) => ({
      type: 'quiz_attempt' as const, title: 'Quiz submitted',
      description: `${quizById(a.quizId)?.title} (${courseById(a.courseId)?.title}) — ${a.percentage}%`, at: a.submittedAt!,
    })),
    ...ACTIVITY_SESSIONS.filter((s) => s.status === 'ended').map((s) => ({
      type: 'simulation_session' as const, title: 'Simulation session',
      description: `${s.simulationTitle} — ${s.formattedDuration}`, at: s.startedAt,
    })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6);

  return {
    role: 'student',
    scope: {
      institution_id: INSTITUTION_ID, institution_name: 'Demo University',
      department_id: DEPARTMENT_ID, department_name: 'Mechanical Engineering',
      academic_year_id: 'dev-ay-0001', academic_year_name: '2026/2027',
      semester_term_id: 'dev-term-0001', semester_term_name: 'Fall 2026',
    },
    kpis: {
      currentCourses: current.length, completedLessons, pendingLessons, quizzesDue: quizzesDue.length,
      quizAttempts: ATTEMPTS.length, simulationTimeSeconds: simSeconds, averageGrade, unreadMessages, unreadNotifications,
    },
    sections: {
      myCourses: current.map((c, i) => ({
        id: c.id, title: c.title, instructorName: c.instructorName ?? null,
        progressPercentage: journeys[i].progress.percentage, latestGrade: latestGrade(c.id),
      })),
      myToDo: {
        quizzesDue: quizzesDue.map((q) => ({ id: q.id, courseId: q.courseId, title: q.title, dueAt: q.dueAt ?? null })),
        pendingLessons,
      },
      myProgress: {
        totalCourseProgress: [], completedLessons, pendingLessons, quizAttempts: ATTEMPTS.length,
        averageGrade, simulationDurationSeconds: simSeconds,
      },
    },
    quick_actions: [
      { label: 'My Courses', href: '/courses' },
      { label: 'Simulations', href: '/simulations' },
      { label: 'Gradebook', href: '/gradebook' },
    ],
    notifications: { unread: unreadNotifications, recent: [] },
    messages: { unread: unreadMessages, recent: [] },
    recent_activity: recent,
  };
}

// ── Instructor dashboard (mock instructor = MOCK_INSTRUCTOR_USER) ─────────────

const isMockInstructor = () => getDevMockUser().id === MOCK_INSTRUCTOR_USER.id;

function instructorDashboard(): TeachingDashboard {
  const mine = COURSES.filter((c) => c.instructorId === MOCK_INSTRUCTOR_USER.id);
  const published = mine.filter((c) => c.status === 'published');
  const drafts = mine.filter((c) => c.status === 'draft');
  const students = mine.reduce((n, c) => n + (c.enrolledCount ?? 0), 0);
  return {
    role: 'instructor',
    scope: {
      institution_id: INSTITUTION_ID, institution_name: 'Demo University',
      department_id: DEPARTMENT_ID, department_name: 'Mechanical Engineering',
      academic_year_id: 'dev-ay-0001', academic_year_name: '2026/2027',
      semester_term_id: 'dev-term-0001', semester_term_name: 'Fall 2026',
    },
    kpis: {
      myCourses: mine.length, publishedCourses: published.length, draftCourses: drafts.length,
      totalEnrolledStudents: students, pendingQuizGrading: 3, pendingSimulationGrading: 2,
      activeSimulationSessions: 4, averageCourseProgress: 58, unreadMessages: 3, unreadNotifications: 5,
    },
    sections: {
      myCourses: mine.map((c) => ({
        id: c.id, title: c.title, status: c.status, departmentName: c.departmentName ?? null,
        academicYearName: c.academicYearName ?? null, semesterTermName: c.semesterTermName ?? null,
        enrolledCount: c.enrolledCount ?? 0, moduleCount: c.moduleCount ?? 0,
      })),
      followUpRequired: {
        pendingQuizGrading: 3,
        pendingSimulationGrading: 2,
        coursesWithoutModules: [],
        draftCoursesNotPublished: drafts.map((c) => ({ id: c.id, title: c.title })),
        perCourse: mine.map((c, i) => ({
          courseId: c.id, title: c.title,
          studentsWithoutAttempts: i === 0 ? 7 : 0, studentsWithoutActivity: i === 0 ? 4 : 2,
        })),
      },
      recentStudentActivity: { quizSubmissions: [], simulationSessions: [] },
      gradebookSummary: {
        averageCourseProgress: 58,
        missingGrades: 9,
        perCourse: mine.map((c, i) => (i === 0
          ? { totalStudents: c.enrolledCount ?? 0, gradedStudents: (c.enrolledCount ?? 0) - 9, missingGrades: 9, avgPercentage: 74.5 }
          : { totalStudents: c.enrolledCount ?? 0, gradedStudents: 0, missingGrades: 0, avgPercentage: null })),
      },
    },
    quick_actions: [
      { label: 'My Courses', href: '/courses' },
      { label: 'Gradebook', href: '/gradebook' },
      { label: 'Messages', href: '/mail' },
    ],
    notifications: { unread: 5, recent: [] },
    messages: { unread: 3, recent: [] },
    recent_activity: [
      { type: 'quiz_attempt', title: 'Quiz submitted', description: 'Nour Ibrahim — Quiz 2 — Bernoulli (Fluid Mechanics): 85%', at: daysFromNow(-0.1) },
      { type: 'simulation_session', title: 'Simulation session', description: 'Youssef Ali — Pipe Flow & Friction Losses, 22 min', at: daysFromNow(-0.3) },
      { type: 'quiz_attempt', title: 'Quiz submitted', description: 'Demo Student — Quiz 1 — Fluid Statics (Fluid Mechanics): 60%', at: daysFromNow(-1) },
      { type: 'simulation_session', title: 'Simulation session', description: 'Nour Ibrahim — Venturi Meter Calibration, 16 min', at: daysFromNow(-2) },
      { type: 'grade_posted', title: 'Grade posted', description: 'Fluid Mechanics — Quiz 1 grades released to 55 students', at: daysFromNow(-4) },
    ],
  };
}

// ── Admin dashboards (super admin · institution admin · department manager) ──

const DEV_SCOPE = {
  institution_id: INSTITUTION_ID, institution_name: 'Demo University',
  department_id: DEPARTMENT_ID, department_name: 'Mechanical Engineering',
  academic_year_id: 'dev-ay-0001', academic_year_name: '2026/2027',
  semester_term_id: 'dev-term-0001', semester_term_name: 'Fall 2026',
};

const flatCatalogs = (nodes: typeof CATALOG_TREE): typeof CATALOG_TREE =>
  nodes.flatMap((n) => [n, ...flatCatalogs(n.children ?? [])]);

function webglCounts() {
  const webgl = SIMULATIONS.filter((s) => s.launchType === 'webgl');
  return {
    total: webgl.length,
    ready: webgl.filter((s) => s.buildStatus === 'ready').length,
    failed: webgl.filter((s) => s.buildStatus === 'failed').length,
    processing: webgl.filter((s) => s.buildStatus === 'processing').length,
  };
}

function platformDashboard(): PlatformDashboard {
  const w = webglCounts();
  return {
    role: 'super_admin',
    scope: { ...DEV_SCOPE, institution_id: null, institution_name: null, department_id: null, department_name: null },
    kpis: {
      totalInstitutions: 4, activeInstitutions: 3, suspendedInstitutions: 1,
      totalUsers: 1286, activeUsers: 942,
      totalCourses: COURSES.length + 37, activeCourses: COURSES.filter((c) => c.status === 'published').length + 29,
      totalSimulationCatalogs: flatCatalogs(CATALOG_TREE).length,
      totalWebGLSimulations: w.total, webglBuildsReady: w.ready, webglBuildsFailed: w.failed,
      pendingQuizGrading: 14, storageUsedGb: 38.6, systemAlerts: 1, unreadPlatformNotifications: 2,
    },
    sections: {
      institutionOverview: [
        { id: INSTITUTION_ID, name: 'Demo University', status: 'active', usersCount: 612, departmentsCount: 6, coursesCount: 24, activeUsersMonth: 488, lastActivity: daysFromNow(-0.05) },
        { id: 'dev-inst-0002', name: 'Cairo Institute of Technology', status: 'active', usersCount: 401, departmentsCount: 4, coursesCount: 13, activeUsersMonth: 297, lastActivity: daysFromNow(-0.4) },
        { id: 'dev-inst-0003', name: 'Delta Engineering College', status: 'active', usersCount: 229, departmentsCount: 3, coursesCount: 8, activeUsersMonth: 151, lastActivity: daysFromNow(-2) },
        { id: 'dev-inst-0004', name: 'Nile Polytechnic', status: 'suspended', usersCount: 44, departmentsCount: 1, coursesCount: 2, activeUsersMonth: 6, lastActivity: daysFromNow(-41) },
      ],
      simulationCatalogAssignment: {
        catalogsAssigned: 7, catalogsUnassigned: 2, institutionsWithoutCatalogs: 1,
        recentAssignments: [
          { catalogName: 'Thermodynamics', institutionName: 'Delta Engineering College', status: 'active', at: daysFromNow(-3) },
          { catalogName: 'Fluid Mechanics', institutionName: 'Cairo Institute of Technology', status: 'active', at: daysFromNow(-9) },
        ],
      },
      systemHealth: { webglBuildsReady: w.ready, webglBuildsFailed: w.failed, webglBuildsProcessing: w.processing, backgroundJobs: null },
    },
    quick_actions: [
      { label: 'Institutions', href: '/institutions' },
      { label: 'Sim Catalogs', href: '/simulation-catalogs' },
      { label: 'Users', href: '/users' },
      { label: 'Audit Logs', href: '/audit-logs' },
    ],
    notifications: { unread: 2, recent: [] },
    messages: { unread: 1, recent: [] },
    recent_activity: [
      { type: 'audit', title: 'Catalog assigned', description: 'Thermodynamics → Delta Engineering College', at: daysFromNow(-3) },
      { type: 'audit', title: 'WebGL build ready', description: 'Rankine Cycle Power Plant v1.3.0', at: daysFromNow(-5) },
      { type: 'audit', title: 'Institution suspended', description: 'Nile Polytechnic — licence expired', at: daysFromNow(-12) },
    ],
  };
}

function institutionDashboard(): InstitutionDashboard {
  const w = webglCounts();
  const published = COURSES.filter((c) => c.status === 'published').length;
  const drafts = COURSES.filter((c) => c.status === 'draft').length;
  const roots = CATALOG_TREE.flatMap((n) => n.children ?? []);
  return {
    role: 'institution_admin',
    scope: { ...DEV_SCOPE, department_id: null, department_name: null },
    kpis: {
      departmentsCount: 6, academicYearsCount: 2, semesterTermsCount: 5,
      totalUsers: 612, studentsCount: 548, instructorsCount: 52, deptManagersCount: 5,
      activeCourses: published, publishedCourses: published, draftCourses: drafts,
      pendingUserTasks: 4, unreadNotifications: 3,
      assignedSimulationCatalogs: roots.length, webglReady: w.ready, webglFailed: w.failed,
    },
    sections: {
      academicStructure: [
        { id: DEPARTMENT_ID, name: 'Mechanical Engineering', code: 'MECH' },
        { id: 'dev-dept-0002', name: 'Civil Engineering', code: 'CIVL' },
        { id: 'dev-dept-0003', name: 'Electrical Engineering', code: 'ELEC' },
        { id: 'dev-dept-0004', name: 'Chemical Engineering', code: 'CHEM' },
        { id: 'dev-dept-0005', name: 'Aerospace Engineering', code: 'AERO' },
        { id: 'dev-dept-0006', name: 'Materials Engineering', code: 'MATS' },
      ],
      usersFollowUp: {
        usersMissingAcademicAssignment: [
          { id: 'dev-u-101', email: 'h.farouk@demo.edu', firstName: 'Hana', lastName: 'Farouk', roles: ['student'] },
          { id: 'dev-u-102', email: 'a.samir@demo.edu', firstName: 'Ahmed', lastName: 'Samir', roles: ['student'] },
          { id: 'dev-u-103', email: 'r.gamal@demo.edu', firstName: 'Rania', lastName: 'Gamal', roles: ['instructor'] },
        ],
        departmentsWithoutManager: [{ id: 'dev-dept-0006', name: 'Materials Engineering', code: 'MATS' }],
      },
      coursesFollowUp: {
        draftCourses: drafts,
        publishedCourses: published,
        coursesWithoutModules: COURSES.filter((c) => (c.moduleCount ?? 0) === 0)
          .map((c) => ({ id: c.id, title: c.title, status: c.status })),
      },
      simulationCatalogs: {
        catalogs: roots.map((c) => ({ id: c.id, name: c.name, itemCount: c.itemCount ?? 0 })),
        webglReady: w.ready,
        webglFailed: w.failed,
      },
    },
    quick_actions: [
      { label: 'Users', href: '/users' },
      { label: 'Courses', href: '/courses' },
      { label: 'Institution Settings', href: '/settings' },
    ],
    notifications: { unread: 3, recent: [] },
    messages: { unread: 2, recent: [] },
    recent_activity: [],
  };
}

function departmentDashboard(): DepartmentDashboard {
  const dept = COURSES.filter((c) => c.departmentId === DEPARTMENT_ID);
  const published = dept.filter((c) => c.status === 'published');
  return {
    role: 'dept_manager',
    scope: DEV_SCOPE,
    kpis: {
      departmentUsers: 214, students: 196, instructors: 14, activeSemesterTerms: 1,
      activeCourses: published.length, publishedCourses: published.length,
      totalLessons: dept.reduce((n, c) => n + (c.moduleCount ?? 0) * 4, 0), totalQuizzes: 11,
      totalSimulationsUsed: SIMULATIONS.length, averageCourseProgress: 61,
      pendingManualGrading: 6, unreadNotifications: 2,
    },
    sections: {
      departmentCourses: dept.map((c) => ({
        id: c.id, title: c.title, status: c.status, instructorName: c.instructorName ?? null,
        enrolledCount: c.enrolledCount ?? 0, moduleCount: c.moduleCount ?? 0,
      })),
      progressFollowUp: {
        averageCourseProgress: 61,
        simulationActivity: { totalLaunches: 384, uniqueStudents: 142, avgDurationSeconds: 1140 },
        pendingManualGrading: 6,
      },
    },
    quick_actions: [
      { label: 'Department Courses', href: '/courses' },
      { label: 'Users', href: '/users' },
      { label: 'Gradebook', href: '/gradebook' },
    ],
    notifications: { unread: 2, recent: [] },
    messages: { unread: 1, recent: [] },
    recent_activity: [],
  };
}

/** GET /dashboard/me — the mock account's own dashboard. */
function myDashboard() {
  switch (getDevMockUser().id) {
    case MOCK_SUPER_ADMIN_USER.id: return platformDashboard();
    case MOCK_INSTITUTION_ADMIN_USER.id: return institutionDashboard();
    case MOCK_DEPT_MANAGER_USER.id: return departmentDashboard();
    case MOCK_INSTRUCTOR_USER.id: return instructorDashboard();
    default: return studentDashboard();
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────
// First match wins, so literal segments (e.g. /courses/me/enrolled) go before params.

const ROUTES: [method: string, pattern: string, handler: Handler][] = [
  // Dashboard
  ['GET', '/dashboard/student', () => ok(studentDashboard())],
  ['GET', '/dashboard/me', () => ok(myDashboard())],
  ['GET', '/dashboard/instructor', () => ok(instructorDashboard())],
  ['GET', '/dashboard/platform', () => ok(platformDashboard())],
  ['GET', '/dashboard/institution', () => ok(institutionDashboard())],
  ['GET', '/dashboard/department', () => ok(departmentDashboard())],

  // Courses
  ['GET', '/courses', ({ q }) => {
    const rows = COURSES.filter((c) =>
      matches(q?.search, c.title, c.description, c.code) && (!q?.status || c.status === q.status)
      && (!q?.instructorId || c.instructorId === q.instructorId));
    const { page, meta } = paginate(rows, q);
    return ok(page, meta);
  }],
  ['GET', '/courses/me/enrolled', () => ok(myCourses())],
  ['GET', '/courses/:id', ({ p }) => ok(requireCourse(p.id))],
  ['GET', '/courses/:id/enrollments/me', ({ p }) => {
    requireCourse(p.id);
    const e = isMockInstructor() ? undefined : ENROLLMENTS.get(p.id);
    if (!e) throw fail(404, 'Not enrolled');
    return ok(e);
  }],
  ['POST', '/courses/:id/enrollments', ({ p, body }) => {
    const c = requireCourse(p.id);
    if (c.enrollmentType === 'code' && !String(body?.enrollmentCode ?? '').trim()) {
      throw fail(400, 'Enrollment code required');
    }
    if (c.enrollmentType === 'admin') throw fail(403, 'Enrollment is managed by an administrator');
    const e: Enrollment = {
      id: `dev-enr-${c.id}`, courseId: c.id, userId: STUDENT_ID, role: 'student',
      status: c.enrollmentType === 'approval' ? 'pending' : 'active', enrolledAt: new Date().toISOString(),
    };
    ENROLLMENTS.set(c.id, e);
    return ok(e);
  }],
  ['DELETE', '/courses/:id/enrollments/:userId', ({ p }) => { ENROLLMENTS.delete(p.id); return ok(null); }],
  ['GET', '/courses/:id/journey', ({ p }) => ok(buildJourney(requireCourse(p.id).id))],
  ['GET', '/courses/:id/modules/tree', ({ p }) => ok(buildCourseTree(requireCourse(p.id).id))],
  ['GET', '/courses/:id/modules', ({ p }) => ok(buildCourseTree(requireCourse(p.id).id).map((m) => ({ ...m, lessons: undefined })))],
  ['POST', '/courses/:id/modules/:moduleId/lessons/:lessonId/complete', ({ p }) => {
    COMPLETED_LESSONS.add(p.lessonId);
    return ok({ lessonId: p.lessonId, userId: STUDENT_ID, courseId: p.id, completedAt: new Date().toISOString() });
  }],

  // Simulation activity (per lesson)
  ['GET', '/lessons/:lessonId/simulation-activity/latest', ({ p }) => ok(latestSessionForLesson(p.lessonId))],
  ['GET', '/users/me/simulation-activity', ({ q }) => {
    const rows = ACTIVITY_SESSIONS
      .filter((s) => (!q?.course_id || s.courseId === q.course_id) && (!q?.status || s.status === q.status)
        && (!q?.date_from || Date.parse(s.startedAt) >= Date.parse(String(q.date_from)))
        && (!q?.date_to || Date.parse(s.startedAt) <= Date.parse(String(q.date_to))))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
    const { page, meta } = paginate(rows, q);
    return ok(page, meta);
  }],

  // Quizzes & attempts
  ['GET', '/courses/:id/quizzes/:quizId', ({ p }) => {
    const q = quizById(p.quizId);
    if (!q) throw fail(404, 'Quiz not found');
    return ok(q);
  }],
  ['GET', '/courses/:id/quizzes/:quizId/questions', ({ p }) => ok(questionsFor(p.quizId))],
  ['GET', '/courses/:id/quizzes/:quizId/attempts/me', ({ p }) =>
    ok(ATTEMPTS.filter((a) => a.quizId === p.quizId).sort((a, b) => a.attemptNumber - b.attemptNumber))],
  ['GET', '/courses/:id/quizzes/:quizId/attempts/:attemptId', ({ p }) => ok(requireAttempt(p.attemptId))],
  ['POST', '/courses/:id/quizzes/:quizId/attempts', ({ p }) => {
    const quiz = quizById(p.quizId);
    if (!quiz) throw fail(404, 'Quiz not found');
    const mine = ATTEMPTS.filter((a) => a.quizId === quiz.id);
    const open = mine.find((a) => a.status === 'in_progress');
    if (open) return ok(open);
    if (mine.length >= quiz.maxAttempts) throw fail(409, 'No attempts remaining', `You have used all ${quiz.maxAttempts} attempt(s) for this quiz.`);
    const at = new Date().toISOString();
    const attempt: QuizAttempt = {
      id: `dev-att-${quiz.id}-${mine.length + 1}`, quizId: quiz.id, userId: STUDENT_ID, institutionId: INSTITUTION_ID,
      departmentId: DEPARTMENT_ID, courseId: quiz.courseId, attemptNumber: mine.length + 1, status: 'in_progress',
      startedAt: at, timeSpentSeconds: 0, pointsPossible: quiz.pointsPossible, createdAt: at, responses: [],
    };
    ATTEMPTS.push(attempt);
    return ok(attempt);
  }],
  ['PATCH', '/courses/:id/quiz-attempts/:attemptId/responses', ({ p, body }) => {
    const attempt = requireAttempt(p.attemptId);
    const questions = questionsFor(attempt.quizId);
    for (const r of (body?.responses as { questionId: string; responsePayload: Record<string, unknown> }[]) ?? []) {
      const question = questions.find((q) => q.id === r.questionId);
      if (!question) continue;
      const graded = gradeResponse(attempt.id, question, r.responsePayload, new Date().toISOString());
      // Scores stay hidden until submission.
      const pending = { ...graded, isCorrect: null, autoScore: null, finalScore: null };
      attempt.responses = [...(attempt.responses ?? []).filter((x) => x.questionId !== r.questionId), pending];
    }
    return ok(null);
  }],
  ['POST', '/courses/:id/quiz-attempts/:attemptId/submit', ({ p }) => {
    const attempt = requireAttempt(p.attemptId);
    const quiz = quizById(attempt.quizId)!;
    const at = new Date().toISOString();
    const questions = questionsFor(quiz.id);
    attempt.responses = (attempt.responses ?? []).map((r) =>
      gradeResponse(attempt.id, questions.find((q) => q.id === r.questionId)!, r.responsePayload, r.answeredAt ?? at));
    const finalScore = attempt.responses.reduce((s, r) => s + (r.finalScore ?? 0), 0);
    const percentage = Math.round((finalScore / quiz.pointsPossible) * 100);
    Object.assign(attempt, {
      status: 'graded', submittedAt: at, gradedAt: at, autoScore: finalScore, finalScore, percentage,
      passed: percentage >= (quiz.passingPercentage ?? 60),
      timeSpentSeconds: Math.round((Date.parse(at) - Date.parse(attempt.startedAt)) / 1000),
    });
    // Submitting a quiz completes its lesson, like the real backend.
    const lesson = COURSES.map((c) => buildJourney(c.id)!).flatMap((j) => j.modules.flatMap((m) => m.lessons))
      .find((l) => l.quizId === quiz.id && l.lessonMode === 'quiz');
    if (lesson) COMPLETED_LESSONS.add(lesson.id);
    return ok(attempt);
  }],

  // Gradebook
  ['GET', '/courses/:id/gradebook/students/:studentId', ({ p }) => ok(studentGrades(requireCourse(p.id).id))],
  ['GET', '/courses/:id/gradebook', ({ p }) => ok(courseGradebook(requireCourse(p.id).id))],

  // Simulations
  ['GET', '/simulation-catalogs/assigned-tree', () => ok(CATALOG_TREE)],
  ['GET', '/simulations', ({ q }) => {
    const catalogs = q?.catalog_id
      ? (q.include_subtree === 'true' ? catalogSubtreeIds(String(q.catalog_id)) : [String(q.catalog_id)])
      : null;
    const rows = SIMULATIONS.filter((s) =>
      matches(q?.search, s.title, s.description) && (!q?.difficulty || s.difficulty === q.difficulty)
      && (q?.scope !== 'demo' || s.visibility === 'demo_public') && (!catalogs || catalogs.includes(s.catalogId ?? '')));
    const { page, meta } = paginate(rows, q);
    return ok(page, meta);
  }],
  ['GET', '/simulations/:id', ({ p }) => {
    const s = simById(p.id);
    if (!s) throw fail(404, 'Simulation not found');
    return ok(s);
  }],
  // No WebGL builds exist in mock mode — fail with a clear, visible message.
  ['POST', '/simulations/:id/launch', () => { throw fail(503, 'Simulation player is not available in demo mode', 'Connect the backend to launch WebGL builds.'); }],
  ['POST', '/simulations/:id/demo-launch', () => { throw fail(503, 'Simulation player is not available in demo mode', 'Connect the backend to launch WebGL builds.'); }],
  ['GET', '/courses/:id/lessons/:lessonId/simulation-launch', () => { throw fail(503, 'Simulation player is not available in demo mode', 'Connect the backend to launch WebGL builds.'); }],

  // Notifications
  ['GET', '/notifications/unread-count', () => ok({ unreadCount: NOTIFICATIONS.filter((n) => n.status === 'unread').length })],
  ['GET', '/notifications', ({ q }) => {
    const rows = NOTIFICATIONS
      .filter((n) => (q?.status ? n.status === q.status : n.status !== 'archived')
        && (!q?.type || n.type === q.type) && (!q?.priority || n.priority === q.priority))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const { page, meta } = paginate(rows, q);
    return ok({ notifications: page, unreadCount: NOTIFICATIONS.filter((n) => n.status === 'unread').length, meta });
  }],
  ['PATCH', '/notifications/mark-all-read', () => {
    NOTIFICATIONS.forEach((n) => { if (n.status === 'unread') Object.assign(n, { status: 'read', isRead: true, readAt: new Date().toISOString() }); });
    return ok(null);
  }],
  ['PATCH', '/notifications/:id/read', ({ p }) => {
    const n = NOTIFICATIONS.find((x) => x.id === p.id);
    if (n) Object.assign(n, { status: 'read', isRead: true, readAt: new Date().toISOString() });
    return ok(null);
  }],
  ['PATCH', '/notifications/:id/archive', ({ p }) => {
    const n = NOTIFICATIONS.find((x) => x.id === p.id);
    if (n) Object.assign(n, { status: 'archived', isRead: true });
    return ok(null);
  }],
  ['DELETE', '/notifications/:id', ({ p }) => {
    const i = NOTIFICATIONS.findIndex((x) => x.id === p.id);
    if (i >= 0) NOTIFICATIONS.splice(i, 1);
    return ok(null);
  }],

  // Mail
  ['GET', '/mail/folder-counts', () => {
    const count = (f: MailFolder) => MAILS.filter((m) => m.folder === f).length;
    return ok({
      counts: { inbox: count('inbox'), sent: count('sent'), draft: count('draft'), archived: count('archived'), trash: count('trash') },
      unreadInbox: MAILS.filter((m) => m.folder === 'inbox' && !m.isRead).length,
    });
  }],
  ['GET', '/mail/unread-count', () => ok({ unreadCount: MAILS.filter((m) => m.folder === 'inbox' && !m.isRead).length })],
  ['GET', '/mail/recipients', ({ q }) =>
    ok(Object.values(PEOPLE).filter((u) => matches(q?.search, u.firstName, u.lastName, u.email)))],
  ['GET', '/mail/messages/:id', ({ p }) => {
    const m = requireMail(p.id);
    m.isRead = true;
    return ok(toDetail(m));
  }],
  ['GET', '/mail/:folder', ({ p, q }) => {
    const folder = FOLDER_BY_PATH[p.folder];
    if (!folder) throw fail(404, 'Unknown folder');
    const rows = MAILS
      .filter((m) => m.folder === folder && (!q?.unread_only || !m.isRead) && (!q?.course_id || m.courseId === q.course_id)
        && (!q?.has_attachments || !!m.attachments?.length) && matches(q?.search, m.subject, m.body))
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .map(toListItem);
    const { page, meta } = paginate(rows, q);
    return ok({ messages: page, meta });
  }],
  ['PATCH', '/mail/messages/:id/read', ({ p }) => { requireMail(p.id).isRead = true; return ok(null); }],
  ['PATCH', '/mail/messages/:id/unread', ({ p }) => { requireMail(p.id).isRead = false; return ok(null); }],
  ['PATCH', '/mail/messages/:id/archive', ({ p }) => { requireMail(p.id).folder = 'archived'; return ok(null); }],
  ['PATCH', '/mail/messages/:id/restore', ({ p }) => { requireMail(p.id).folder = 'inbox'; return ok(null); }],
  ['DELETE', '/mail/messages/:id', ({ p }) => {
    const m = requireMail(p.id);
    if (m.folder === 'trash') MAILS.splice(MAILS.indexOf(m), 1); else m.folder = 'trash';
    return ok(null);
  }],
  ['POST', '/mail/messages', ({ body }) => ok(toDetail(newMail(body, 'sent')))],
  ['POST', '/mail/messages/:id/reply', ({ p, body }) => {
    const orig = requireMail(p.id);
    return ok(toDetail(newMail({ ...body, to: [orig.from.id], subject: `Re: ${orig.subject}`, courseId: orig.courseId }, 'sent', { threadId: orig.threadId, messageType: 'reply' })));
  }],
  ['POST', '/mail/messages/:id/reply-all', ({ p, body }) => {
    const orig = requireMail(p.id);
    const to = [orig.from, ...orig.to, ...(orig.cc ?? [])].map((u) => u.id).filter((id) => id !== STUDENT_ID);
    return ok(toDetail(newMail({ ...body, to, subject: `Re: ${orig.subject}`, courseId: orig.courseId }, 'sent', { threadId: orig.threadId, messageType: 'reply' })));
  }],
  ['POST', '/mail/messages/:id/forward', ({ p, body }) => {
    const orig = requireMail(p.id);
    return ok(toDetail(newMail({ subject: `Fwd: ${orig.subject}`, ...body }, 'sent', { messageType: 'forward', attachments: orig.attachments })));
  }],
  ['POST', '/mail/drafts', ({ body }) => ok({ id: newMail(body, 'draft').id })],
  ['PATCH', '/mail/drafts/:id', ({ p, body }) => {
    const m = requireMail(p.id);
    Object.assign(m, {
      subject: body?.subject ?? m.subject, body: body?.body ?? m.body,
      to: body?.to ? people(body.to) : m.to, cc: body?.cc ? people(body.cc) : m.cc, at: new Date().toISOString(),
    });
    return ok(null);
  }],
  ['DELETE', '/mail/drafts/:id', ({ p }) => { MAILS.splice(MAILS.indexOf(requireMail(p.id)), 1); return ok(null); }],
  ['POST', '/mail/drafts/:id/send', ({ p }) => {
    const m = requireMail(p.id);
    Object.assign(m, { folder: 'sent', at: new Date().toISOString() });
    return ok(toDetail(m));
  }],

  // Profile
  ['PATCH', '/users/:id', ({ body }) => {
    Object.assign(MOCK_STUDENT_USER, body ?? {});
    return ok<User>(MOCK_STUDENT_USER);
  }],
];

function matchRoute(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
  const segs = path.split('?')[0].split('/').filter(Boolean);
  for (const [m, pattern, handler] of ROUTES) {
    if (m !== method) continue;
    const parts = pattern.split('/').filter(Boolean);
    if (parts.length !== segs.length) continue;
    const params: Record<string, string> = {};
    if (parts.every((part, i) => (part.startsWith(':') ? ((params[part.slice(1)] = decodeURIComponent(segs[i])), true) : part === segs[i]))) {
      return { handler, params };
    }
  }
  return null;
}

// ── Fallback entry point (called from lib/api.ts) ────────────────────────────

const REAL_REQUEST_TIMEOUT_MS = 2500;
/** Once the backend is unreachable, skip it for the rest of the page session. */
let backendUnreachable = false;

export async function devMockRequest<T>(
  method: string,
  path: string,
  params: Record<string, unknown> | undefined,
  body: unknown,
  real: () => Promise<ApiSuccess<T>>,
): Promise<ApiSuccess<T>> {
  const route = matchRoute(method, path);
  if (!route) return real();

  if (!backendUnreachable) {
    try {
      return await Promise.race([
        real(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new TypeError('timeout')), REAL_REQUEST_TIMEOUT_MS)),
      ]);
    } catch (err) {
      if (err instanceof TypeError) {
        backendUnreachable = true;
        console.info('[dev-mock] Backend unreachable — serving mock data (lib/devMockApi.ts).');
      }
    }
  }

  // Tiny delay so loading states still flash like a real request.
  await new Promise((r) => setTimeout(r, 120));
  return route.handler({ p: route.params, q: params, body: body as Body }) as ApiSuccess<T>;
}

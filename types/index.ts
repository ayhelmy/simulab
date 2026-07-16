// SRS §9 Domain types — aligned with updated database schema.

export type UserRole =
  | 'super_admin'
  | 'institution_admin'
  | 'dept_manager'
  | 'instructor'
  | 'teaching_assistant'
  | 'student'
  | 'guest';

export interface RoleInfo {
  id: string;
  name: UserRole;
  label: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  /** SRS §9: status replaces is_active + email_verified */
  status: 'active' | 'suspended' | 'pending';
  institutionId?: string;
  roles: RoleInfo[];
  permissions: string[];            // dot-notation permission codes from §12 matrix
  /** Department IDs this user manages (dept_manager role only) */
  managedDepartments?: string[];
  /** Course IDs this user is enrolled in */
  enrolledCourseIds?: string[];
  /** Course IDs this user is a TA for */
  taCourseIds?: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  currentStudentAssignment?: {
    id: string;
    departmentId: string;
    departmentName?: string;
    departmentCode?: string;
    academicYearId: string;
    academicYearName?: string;
    semesterTermId: string;
    semesterTermName?: string;
  } | null;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  primaryColor: string;
  timezone: string;
  locale: string;
  subscriptionPlan: 'trial' | 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  status: 'active' | 'suspended';
}

export interface Department {
  id: string;
  institutionId: string;
  name: string;
  code?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  parentId?: string;
}

export interface AcademicYear {
  id: string;
  institutionId: string;
  departmentId: string;
  name: string;
  code?: string | null;
  yearOrder: number;
  status: 'active' | 'inactive' | 'archived';
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SemesterTerm {
  id: string;
  institutionId: string;
  departmentId: string;
  academicYearId: string;
  name: string;
  code?: string | null;
  termOrder: number;
  status: 'active' | 'inactive' | 'archived';
  startDate?: string | null;
  endDate?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // joined
  academicYearName?: string;
  academicYearCode?: string;
  yearOrder?: number;
}

export interface UserAcademicAssignment {
  id: string;
  userId: string;
  institutionId: string;
  departmentId: string;
  academicYearId: string;
  semesterTermId: string;
  roleContext: 'instructor' | 'student' | 'teaching_assistant' | 'dept_manager';
  isCurrent: boolean;
  assignedBy?: string | null;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
  // joined
  departmentName?: string;
  departmentCode?: string;
  academicYearName?: string;
  academicYearCode?: string;
  yearOrder?: number;
  semesterTermName?: string;
  semesterTermCode?: string;
  termOrder?: number;
}

/** @deprecated Use AcademicYear + SemesterTerm instead */
export interface AcademicTerm {
  id: string;
  institutionId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Domain {
  id: string;
  institutionId?: string;
  name: string;
  description?: string;
  iconUrl?: string;
  color: string;
}

export interface Course {
  id: string;
  institutionId: string;
  departmentId?: string;
  academicYearId?: string | null;
  semesterTermId?: string | null;
  termId?: string;
  domainId?: string;
  instructorId: string;
  code?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'published' | 'archived';
  enrollmentType: 'open' | 'approval' | 'code' | 'admin';
  enrollmentCap?: number;
  startDate?: string;
  endDate?: string;
  passingGrade: number;
  settings: Record<string, unknown>;
  publishedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  departmentName?: string | null;
  departmentCode?: string | null;
  academicYearName?: string | null;
  semesterTermName?: string | null;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  role: 'student' | 'instructor' | 'ta';
  status: 'pending' | 'active' | 'dropped' | 'completed';
  finalGrade?: number;
  enrolledAt: string;
  completedAt?: string;
}

export type LessonMode = 'content' | 'simulation' | 'content_and_simulation';
export type ContentType = 'rich_text' | 'video' | 'file' | 'url' | 'scorm';

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  position: number;
  isPublished: boolean;
  unlockAt?: string | null;
  prerequisiteModuleId?: string | null;
  /** Populated by the /modules/tree endpoint */
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId?: string | null;
  institutionId?: string | null;
  departmentId?: string | null;
  title: string;
  /** Primary mode — determines which content panels are shown */
  lessonMode: LessonMode;
  /** Type of content payload; null when lessonMode is 'simulation' */
  contentType?: ContentType | null;
  /** Legacy field kept for backward compat */
  type?: string;
  content: Record<string, unknown>;
  simulationId?: string | null;
  /** Catalog node the simulation was selected from */
  catalogId?: string | null;
  position: number;
  estimatedMinutes?: number | null;
  isRequired: boolean;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface LessonCompletion {
  lessonId: string;
  userId: string;
  courseId: string;
  completedAt: string;
}

// ── Course Journey types (SRS §4.8 PRG-01, §4.15 CMS) ────────────────────────

export type LessonCompletionStatus = 'not_started' | 'completed';

export interface SimulationMeta {
  id: string;
  title: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  difficulty?: string | null;
  type?: string | null;
  thumbnailUrl?: string | null;
  launchType?: SimulationLaunchType | null;
  buildStatus?: SimulationBuildStatus | null;
  buildUuid?: string | null;
}

export interface JourneyLesson {
  id: string;
  moduleId: string;
  title: string;
  lessonMode: LessonMode;
  contentType?: ContentType | null;
  type?: string;
  content: Record<string, unknown>;
  simulationId?: string | null;
  estimatedMinutes?: number | null;
  isRequired: boolean;
  isPublished: boolean;
  isLocked: boolean;
  completionStatus: LessonCompletionStatus;
  simulation?: SimulationMeta | null;
  position: number;
}

export interface JourneyModule {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  position: number;
  isPublished: boolean;
  isLocked: boolean;
  unlockAt?: string | null;
  prerequisiteModuleId?: string | null;
  lessons: JourneyLesson[];
}

export interface CourseJourney {
  course: {
    id: string;
    title: string;
    description?: string | null;
    departmentId?: string | null;
    academicYearId?: string | null;
    semesterTermId?: string | null;
    status: string;
    departmentName?: string | null;
    academicYearName?: string | null;
    semesterTermName?: string | null;
  };
  progress: {
    percentage: number;
    completedLessons: number;
    totalLessons: number;
  };
  modules: JourneyModule[];
}

export type SimulationLaunchType = 'webgl' | 'scorm' | 'lti' | 'internal';
export type SimulationBuildStatus = 'processing' | 'ready' | 'failed';

export interface Simulation {
  id: string;
  institutionId?: string;
  domainId?: string;
  title: string;
  description?: string;
  type: 'scorm' | 'lti' | 'internal' | 'webgl';
  launchUrl?: string | null;
  thumbnailUrl?: string;
  estimatedMinutes?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  maxScore: number;
  passScore: number;
  maxAttempts: number;
  scoringConfig: Record<string, unknown>;
  learningObjectives: string[];
  status: 'draft' | 'active' | 'deprecated';
  visibility: 'private' | 'institution' | 'demo_public' | 'demo_and_institution';
  version: string;
  // WebGL build fields (migration 029)
  launchType?: SimulationLaunchType | null;
  buildUuid?: string | null;
  originalZipFilename?: string | null;
  storagePath?: string | null;
  publicEntryUrl?: string | null;
  entryFile?: string;
  buildStatus?: SimulationBuildStatus | null;
  buildValidation?: Record<string, unknown> | null;
  fileSizeBytes?: number | null;
}

export interface WebGLLaunchResult {
  launchUrl: string;
  simulationId: string;
  buildUuid?: string | null;
  launchType: SimulationLaunchType;
  buildStatus?: SimulationBuildStatus | null;
  title: string;
  description?: string | null;
  difficulty?: string | null;
  estimatedMinutes?: number | null;
}

export interface SimulationCatalog {
  id:             string;
  name:           string;
  description?:   string;
  slug?:          string;
  /** null = root catalog */
  parentId?:      string | null;
  rootCatalogId?: string | null;
  /** 0 = root */
  depth:          number;
  /** Materialized path: "root-id/child-id/grandchild-id" */
  path?:          string;
  sortOrder?:     number;
  visibility:     'global' | 'institution' | 'demo_public' | 'demo_and_institution';
  institutionId?: string | null;
  isGlobal?:      boolean;
  isDemo?:        boolean;
  status:         'draft' | 'active' | 'archived';
  itemCount?:     number;
  /** Populated on tree responses */
  children?:      SimulationCatalog[];
  /** Populated on detail responses */
  ancestors?:     SimulationCatalog[];
  /** Only present on institution-assignment rows */
  includeSubtree?: boolean;
  createdBy?:     string;
  createdAt?:     string;
  updatedAt?:     string;
  assignedAt?:    string;
}

export interface SimulationSession {
  id: string;
  simulationId: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  score?: number;
  maxScore: number;
  activeSeconds: number;
  startedAt: string;
  completedAt?: string;
}

export interface GradeItem {
  id: string;
  courseId: string;
  title: string;
  itemType: 'simulation' | 'assignment' | 'quiz' | 'participation';
  lessonId?: string;
  simulationId?: string;
  maxPoints: number;
  weight: number;
  dueDate?: string;
}

export interface Grade {
  id: string;
  gradeItemId: string;
  userId: string;
  score?: number;
  pointsPossible?: number;
  isOverride: boolean;
  overrideNote?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  subject?: string;
  threadType: 'direct' | 'course';
  courseId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  lastReadAt?: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  attachmentUrl?: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface CourseProgress {
  userId: string;
  courseId: string;
  courseTitle?: string;
  completionPct: number;
  currentGrade?: number;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  updatedAt: string;
}

export interface Competency {
  id: string;
  institutionId?: string;
  code: string;
  title: string;
  description?: string;
  parentId?: string;
}

// ── Public catalog types ──────────────────────────────────────────────────────

export interface SimulationSearchFilters {
  search?: string;
  catalogId?: string;
  includeChildren?: boolean;
  difficulty?: Simulation['difficulty'];
  page?: number;
  limit?: number;
}

export interface SimulationSearchMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SimulationSearchResponse {
  simulations: Simulation[];
  meta: SimulationSearchMeta;
}

// ── Simulation Activity Tracking (migration 036) ──────────────────────────────

export type ActivitySessionStatus = 'active' | 'ended' | 'abandoned' | 'expired';
export type ActivityExitReason    = 'user_exit' | 'navigation' | 'browser_close' | 'timeout' | 'error';

/** Returned by POST …/simulation-activity/start */
export interface ActivityStartResult {
  sessionId:        string;
  startedAt:        string;
  status:           ActivitySessionStatus;
  launchUrl:        string;
  simulationId:     string;
  title:            string;
  difficulty:       string | null;
  estimatedMinutes: number | null;
  launchType:       string | null;
  buildStatus:      string | null;
}

/** Returned by POST …/simulation-activity/:id/end */
export interface ActivityEndResult {
  sessionId:         string;
  startedAt:         string;
  endedAt:           string | null;
  durationSeconds:   number;
  formattedDuration: string;
  status:            ActivitySessionStatus;
  exitReason:        ActivityExitReason | null;
}

/** Summary card for a single session (student view) */
export interface SimulationActivitySession {
  id:                string;
  courseId:          string;
  courseTitle:       string | null;
  moduleId:          string;
  moduleTitle:       string | null;
  lessonId:          string;
  lessonTitle:       string | null;
  simulationId:      string;
  simulationTitle:   string | null;
  startedAt:         string;
  endedAt:           string | null;
  durationSeconds:   number;
  formattedDuration: string;
  status:            ActivitySessionStatus;
  exitReason:        ActivityExitReason | null;
}

/** Session row as returned to instructors */
export interface InstructorActivitySession {
  id:                string;
  userId:            string;
  userRole:          string;
  userFirstName:     string | null;
  userLastName:      string | null;
  userEmail:         string | null;
  moduleId:          string;
  moduleTitle:       string | null;
  lessonId:          string;
  lessonTitle:       string | null;
  simulationId:      string;
  simulationTitle:   string | null;
  startedAt:         string;
  endedAt:           string | null;
  durationSeconds:   number;
  formattedDuration: string;
  status:            ActivitySessionStatus;
  exitReason:        ActivityExitReason | null;
  stepsStatus:       'passed' | 'failed' | null;
}

/** Summary statistics shown in instructor header */
export interface CourseActivitySummary {
  totalLaunches:          number;
  uniqueStudents:         number;
  totalDurationSeconds:   number;
  avgDurationSeconds:     number;
  formattedTotalDuration: string;
  formattedAvgDuration:   string;
}

/** Latest session snapshot shown on the course home page per lesson */
export interface LatestActivitySession {
  id:                string;
  startedAt:         string;
  endedAt:           string | null;
  durationSeconds:   number;
  formattedDuration: string;
  status:            ActivitySessionStatus;
}

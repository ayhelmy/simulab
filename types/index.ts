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
  instructorName?: string | null;
  enrolledCount?: number;
  moduleCount?: number;
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

export type LessonMode =
  | 'content' | 'simulation' | 'content_and_simulation'
  | 'quiz' | 'content_and_quiz' | 'simulation_and_quiz' | 'content_simulation_and_quiz';
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
  quizId?: string | null;
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
  /** Not returned by the journey endpoint today; the UI renders it only when present. */
  learningObjectives?: string[] | null;
}

export interface QuizMeta {
  id: string;
  title: string;
  description?: string | null;
  pointsPossible: number;
  passingScore?: number | null;
  passingPercentage?: number | null;
  maxAttempts: number;
  timeLimitSeconds?: number | null;
  dueAt?: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  status: 'draft' | 'published' | 'archived';
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
  quizId?: string | null;
  estimatedMinutes?: number | null;
  isRequired: boolean;
  isPublished: boolean;
  isLocked: boolean;
  completionStatus: LessonCompletionStatus;
  simulation?: SimulationMeta | null;
  quiz?: QuizMeta | null;
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

// ── Quizzes ───────────────────────────────────────────────────────────────────

export type QuizAttemptScoringMode = 'latest' | 'highest' | 'first' | 'average';
export type QuizShowPolicy = 'immediately' | 'after_due_date' | 'after_final_attempt' | 'never';
export type QuizGradeReleaseMode = 'automatic' | 'instructor_approval';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuestionType =
  | 'single_choice' | 'multiple_choice' | 'true_false'
  | 'short_text' | 'long_text'
  | 'numeric' | 'numeric_tolerance'
  | 'matching' | 'ordering'
  | 'fill_in_blank' | 'multiple_fill_in_blank'
  | 'hotspot' | 'file_upload' | 'formula';

export interface Quiz {
  id: string;
  institutionId: string;
  departmentId?: string | null;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  qtiIdentifier?: string | null;
  qtiVersion?: string | null;
  pointsPossible: number;
  passingScore?: number | null;
  passingPercentage?: number | null;
  maxAttempts: number;
  attemptScoringMode: QuizAttemptScoringMode;
  timeLimitSeconds?: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  oneQuestionAtATime: boolean;
  allowBackNavigation: boolean;
  showScorePolicy: QuizShowPolicy;
  showAnswersPolicy: QuizShowPolicy;
  gradeReleaseMode: QuizGradeReleaseMode;
  availableFrom?: string | null;
  dueAt?: string | null;
  availableUntil?: string | null;
  status: QuizStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface QuizQuestionOption {
  id: string;
  optionIdentifier: string;
  content: string;
  isCorrect?: boolean;
  position: number;
  feedback?: string | null;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TaxonomyLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface QuizQuestion {
  id: string;
  quizId: string;
  qtiIdentifier?: string | null;
  questionType: QuestionType;
  title?: string | null;
  prompt: string;
  responseIdentifier?: string | null;
  points: number;
  position: number;
  required: boolean;
  manualGrading: boolean;
  shuffleOptions: boolean;
  difficultyLevel?: DifficultyLevel | null;
  taxonomyLevel?: TaxonomyLevel | null;
  questionData: Record<string, unknown>;
  responseDeclaration: Record<string, unknown>;
  scoringConfig: Record<string, unknown>;
  feedbackConfig: Record<string, unknown>;
  options: QuizQuestionOption[];
  createdAt: string;
  updatedAt?: string | null;
}

export type QuizAttemptStatus =
  | 'in_progress' | 'submitted' | 'graded' | 'pending_manual_grading' | 'expired' | 'abandoned';

export interface QuizResponse {
  id: string;
  attemptId: string;
  questionId: string;
  responsePayload: Record<string, unknown>;
  isCorrect: boolean | null;
  autoScore?: number | null;
  manualScore?: number | null;
  finalScore?: number | null;
  feedback?: string | null;
  answeredAt?: string | null;
  gradedBy?: string | null;
  gradedAt?: string | null;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  institutionId: string;
  departmentId?: string | null;
  courseId: string;
  lessonId?: string | null;
  attemptNumber: number;
  status: QuizAttemptStatus;
  startedAt: string;
  submittedAt?: string | null;
  gradedAt?: string | null;
  timeSpentSeconds: number;
  autoScore?: number | null;
  manualScore?: number | null;
  finalScore?: number | null;
  pointsPossible?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  gradedBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  responses?: QuizResponse[];
  /** Only present on instructor-facing listAttempts (LEFT JOIN users on the backend). */
  studentName?: string;
  studentEmail?: string;
}

// ── Gradebook (SRS §4.8 GRD-01–07) — GradeItem/Grade themselves are defined
// further below alongside the other simulation-activity types; extended here
// with the fields the gradebook UI needs (quizId/categoryId/source-tracing). ──

export type GradeItemType = GradeItem['itemType'];

export interface GradebookCell {
  id: string;
  score: number | null;
  pointsPossible: number | null;
  isOverride: boolean;
  gradedAt: string | null;
  quizAttemptId?: string | null;
  simulationScoreId?: string | null;
}

export interface GradebookResponse {
  items: (GradeItem & { maxPoints: number })[];
  students: { id: string; firstName: string; lastName: string; email: string }[];
  grid: Record<string, Record<string, GradebookCell>>;
}

export interface StudentGradesResponse {
  studentId: string;
  courseId: string;
  weightedPct: number | null;
  grades: { item: GradeItem; grade: Grade | null }[];
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
  isFeatured?: boolean;
  featuredOrder?: number | null;
}

export interface SimulationScore {
  id: string;
  simulationActivitySessionId?: string | null;
  simulationId: string;
  userId: string;
  institutionId: string;
  departmentId?: string | null;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  attemptNumber: number;
  scoreSource: 'simulation' | 'instructor' | 'completion_rule' | 'imported';
  rawScore: number | null;
  pointsPossible: number | null;
  percentage: number | null;
  passed: boolean | null;
  status: 'pending' | 'received' | 'graded' | 'overridden';
  externalScorePayload?: Record<string, unknown> | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  gradedBy?: string | null;
  overrideReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
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
  lessonId?: string | null;
  simulationId?: string | null;
  quizId?: string | null;
  categoryId?: string | null;
  maxPoints: number;
  weight: number;
  dueDate?: string | null;
  createdAt?: string;
}

export interface Grade {
  id: string;
  gradeItemId: string;
  userId: string;
  score: number | null;
  pointsPossible: number | null;
  isOverride: boolean;
  overrideNote?: string | null;
  gradedBy?: string | null;
  gradedAt?: string | null;
  institutionId?: string | null;
  quizAttemptId?: string | null;
  simulationScoreId?: string | null;
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  institutionId?: string | null;
  departmentId?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  senderId?: string | null;
  priority: NotificationPriority;
  channel: NotificationChannel;
  data?: { actionUrl?: string; [key: string]: unknown } | null;
  status: NotificationStatus;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export type NotificationPreferenceCategory =
  | 'messages' | 'course_announcements' | 'enrollment_updates'
  | 'quiz_updates' | 'grade_updates' | 'simulation_updates' | 'system_alerts';

export interface NotificationPreferences {
  id: string;
  userId: string;
  institutionId?: string | null;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  digestFrequency: 'instant' | 'daily' | 'weekly' | 'off';
  preferences: Record<NotificationPreferenceCategory, boolean>;
  updatedAt: string;
}

// ── Mail (asynchronous mailbox messaging — no live chat) ────────────────────

export type MailFolder = 'inbox' | 'sent' | 'draft' | 'archived' | 'trash';
export type MailMessageType = 'normal' | 'reply' | 'forward' | 'announcement' | 'system';

export interface MailAttachment {
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  fileSize?: number | null;
}

/** A row in a folder listing (Inbox/Sent/Drafts/Archived/Trash). */
export interface MailListItem {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  subject: string;
  bodyPreview: string;
  messageType: MailMessageType;
  hasAttachments: boolean;
  attachmentCount: number;
  courseId?: string | null;
  courseTitle?: string | null;
  isRead: boolean;
  folder: MailFolder;
  recipientType: 'to' | 'cc' | 'bcc' | null;
  sentAt?: string | null;
  createdAt: string;
  /** Only populated for Sent/Draft folder rows. */
  recipients?: string[];
}

export interface MailRecipientRef {
  userId: string;
  firstName: string;
  lastName: string;
}

export interface MailThreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  subject?: string | null;
  body: string;
  messageType: MailMessageType;
  sentAt?: string | null;
  createdAt: string;
}

/** Full message detail — Bcc is present only when the caller is the sender. */
export interface MailMessageDetail {
  id: string;
  threadId: string;
  subject: string;
  body: string;
  messageType: MailMessageType;
  attachments: MailAttachment[];
  courseId?: string | null;
  courseTitle?: string | null;
  parentMessageId?: string | null;
  sentAt?: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null;
  to: MailRecipientRef[];
  cc: MailRecipientRef[];
  bcc?: MailRecipientRef[];
  folder: MailFolder;
  isRead: boolean;
  isSender: boolean;
  thread: MailThreadMessage[];
}

export interface MailFolderCounts {
  counts: Record<MailFolder, number>;
  unreadInbox: number;
}

export interface MessageableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
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

/** Simulation as returned by the catalog search endpoint — includes its root catalog discipline name. */
export interface CatalogSimulation extends Simulation {
  discipline: string | null;
}

/** Simulation as returned by the single-simulation detail endpoint — includes its root catalog id + discipline name. */
export interface SimulationDetail extends Simulation {
  discipline: string | null;
  catalogId: string | null;
}

export interface SimulationSearchResponse {
  simulations: CatalogSimulation[];
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
  buildUuid:        string | null;
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

// ─── Role-based dashboards ───────────────────────────────────────────────────
// Mirrors the backend contract at GET /api/v1/dashboard/{me,platform,institution,
// department,instructor,ta,student} — one shape reused across all 7 roles, with
// role-specific `kpis`/`sections` payloads.

export interface DashboardScope {
  institution_id: string | null;
  institution_name?: string | null;
  department_id: string | null;
  department_name?: string | null;
  academic_year_id: string | null;
  academic_year_name?: string | null;
  semester_term_id: string | null;
  semester_term_name?: string | null;
}

export interface QuickAction {
  label: string;
  href: string;
}

export interface RecentActivityItem {
  type: 'audit' | 'quiz_attempt' | 'simulation_session' | 'grade_posted';
  title: string;
  description: string;
  at: string;
}

export interface DashboardEnvelope<TKpis = Record<string, unknown>, TSections = Record<string, unknown>> {
  role: UserRole;
  scope: DashboardScope;
  kpis: TKpis;
  sections: TSections;
  quick_actions: QuickAction[];
  notifications: { unread: number; recent: unknown[] };
  messages: { unread: number; recent: unknown[] };
  recent_activity: RecentActivityItem[];
}

export interface InstitutionOverviewRow {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  usersCount: number;
  departmentsCount: number;
  coursesCount: number;
  activeUsersMonth: number;
  lastActivity: string | null;
}

export interface CatalogAssignmentOverview {
  catalogsAssigned: number;
  catalogsUnassigned: number;
  institutionsWithoutCatalogs: number;
  recentAssignments: { catalogName: string; institutionName: string; status: string; at: string | null }[];
}

export interface PlatformKpis {
  totalInstitutions: number;
  activeInstitutions: number;
  suspendedInstitutions: number;
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  activeCourses: number;
  totalSimulationCatalogs: number;
  totalWebGLSimulations: number;
  webglBuildsReady: number;
  webglBuildsFailed: number;
  pendingQuizGrading: number;
  storageUsedGb: number | null;
  systemAlerts: number;
  unreadPlatformNotifications: number;
}

export interface PlatformSections {
  institutionOverview: InstitutionOverviewRow[];
  simulationCatalogAssignment: CatalogAssignmentOverview;
  systemHealth: {
    webglBuildsReady: number;
    webglBuildsFailed: number;
    webglBuildsProcessing: number;
    backgroundJobs: null;
  };
}

export interface InstitutionKpis {
  departmentsCount: number;
  academicYearsCount: number;
  semesterTermsCount: number;
  totalUsers: number;
  studentsCount: number;
  instructorsCount: number;
  deptManagersCount: number;
  activeCourses: number;
  publishedCourses: number;
  draftCourses: number;
  pendingUserTasks: number;
  unreadNotifications: number;
  assignedSimulationCatalogs: number;
  webglReady: number;
  webglFailed: number;
}

export interface InstitutionSections {
  academicStructure: { id: string; name: string; code?: string | null }[];
  usersFollowUp: {
    usersMissingAcademicAssignment: { id: string; email: string; firstName: string; lastName: string; roles: string[] }[];
    departmentsWithoutManager: { id: string; name: string; code?: string | null }[];
  };
  coursesFollowUp: {
    draftCourses: number;
    publishedCourses: number;
    coursesWithoutModules: { id: string; title: string; status: string }[];
  };
  simulationCatalogs: {
    catalogs: unknown[];
    webglReady: number;
    webglFailed: number;
  };
}

export interface DepartmentKpis {
  departmentUsers: number;
  students: number;
  instructors: number;
  activeSemesterTerms: number;
  activeCourses: number;
  publishedCourses: number;
  totalLessons: number;
  totalQuizzes: number;
  totalSimulationsUsed: number;
  averageCourseProgress: number | null;
  pendingManualGrading: number;
  unreadNotifications: number;
}

export interface DepartmentCourseRow {
  id: string;
  title: string;
  status: string;
  instructorName: string | null;
  enrolledCount: number;
  moduleCount: number;
}

export interface DepartmentSections {
  departmentCourses: DepartmentCourseRow[];
  progressFollowUp: {
    averageCourseProgress: number | null;
    simulationActivity: { totalLaunches: number; uniqueStudents: number; avgDurationSeconds: number };
    pendingManualGrading: number;
  } | null;
}

export interface TeachingKpis {
  myCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrolledStudents: number;
  pendingQuizGrading: number;
  pendingSimulationGrading: number;
  activeSimulationSessions: number;
  averageCourseProgress: number | null;
  unreadMessages: number;
  unreadNotifications: number;
}

export interface TeachingCourseRow {
  id: string;
  title: string;
  status: string;
  departmentName: string | null;
  academicYearName: string | null;
  semesterTermName: string | null;
  enrolledCount: number;
  moduleCount: number;
}

export interface TeachingSections {
  myCourses: TeachingCourseRow[];
  followUpRequired: {
    pendingQuizGrading: number;
    pendingSimulationGrading: number;
    coursesWithoutModules: { id: string; title: string }[];
    draftCoursesNotPublished: { id: string; title: string }[];
    perCourse: { courseId: string; title: string; studentsWithoutAttempts: number; studentsWithoutActivity: number }[];
  };
  recentStudentActivity: { quizSubmissions: unknown[]; simulationSessions: unknown[] };
  gradebookSummary: {
    averageCourseProgress: number | null;
    missingGrades: number;
    perCourse: { totalStudents: number; gradedStudents: number; missingGrades: number; avgPercentage: number | null }[];
  };
}

export interface StudentKpis {
  currentCourses: number;
  completedLessons: number;
  pendingLessons: number;
  quizzesDue: number;
  quizAttempts: number;
  simulationTimeSeconds: number;
  averageGrade: number | null;
  unreadMessages: number;
  unreadNotifications: number;
}

export interface StudentCourseRow {
  id: string;
  title: string;
  instructorName: string | null;
  progressPercentage: number | null;
  latestGrade: number | null;
}

export interface StudentSections {
  myCourses: StudentCourseRow[];
  myToDo: {
    quizzesDue: { id: string; courseId: string; title: string; dueAt: string | null }[];
    pendingLessons: number;
  };
  myProgress: {
    totalCourseProgress: unknown[];
    completedLessons: number;
    pendingLessons: number;
    quizAttempts: number;
    averageGrade: number | null;
    simulationDurationSeconds: number;
  } | null;
}

// ── LTI 1.3 Integration (Phase 1 — registration + security) ──────────────────

export interface LtiDeployment {
  id: string;
  platformId: string;
  deploymentId: string;
  label: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface LtiPlatform {
  id: string;
  institutionId: string;
  platformName: string;
  issuer: string;
  clientId: string;
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  allowedScopes: string[];
  roleMapping: Record<string, string>;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface LtiPlatformDetail extends LtiPlatform {
  deployments: LtiDeployment[];
}

export interface LtiToolKey {
  id: string;
  keyName: string | null;
  kid: string;
  fingerprint: string;
  status: 'active' | 'retired';
  createdAt: string;
  rotatedAt: string | null;
}

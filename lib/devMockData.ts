/**
 * DEV ONLY — in-memory sample data for previewing the student UI without the
 * backend/PostgreSQL. Served by lib/devMockApi.ts when a request fails in dev
 * mock mode (NEXT_PUBLIC_DEV_MOCK_AUTH=true). State lives in module memory, so
 * a full page reload resets it. Delete this file when the backend is connected.
 */

import type {
  Course, Enrollment, LessonMode, ContentType, Simulation, SimulationDetail, SimulationCatalog,
  Quiz, QuizQuestion, QuizAttempt, QuizResponse, Notification, MailFolder, MailListItem,
  MailThreadMessage, MessageableUser, SimulationActivitySession, LatestActivitySession,
  CourseJourney, JourneyModule, JourneyLesson, CourseModule, Lesson,
} from '@/types';
import { MOCK_STUDENT_USER } from './devMock';

const now = Date.now();
export const daysFromNow = (d: number) => new Date(now + d * 86_400_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

const STUDENT_ID = MOCK_STUDENT_USER.id;
const INSTITUTION_ID = 'dev-inst-0001';
const DEPARTMENT_ID = 'dev-dept-0001';

// ── Thumbnails ───────────────────────────────────────────────────────────────
// Self-contained SVG data URIs (no network). Parentheses/quotes are escaped so
// the URI also works inside the unquoted CSS `url(...)` the course cards use.

// Artwork only — no title text, so the card title is not repeated inside the image.
// Course colours are soft tints of the BEDO palette: orange #F59324, blue #5C98B7, gray #DDDEDF.
function thumb(from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="640" height="360" fill="url(#g)"/>` +
    `<circle cx="540" cy="70" r="120" fill="#ffffff" fill-opacity="0.12"/>` +
    `<circle cx="90" cy="330" r="150" fill="#ffffff" fill-opacity="0.08"/>` +
    `<path d="M0 250 C160 190 320 310 640 220 L640 360 L0 360 Z" fill="#ffffff" fill-opacity="0.10"/>` +
    `</svg>`;
  const encoded = encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/'/g, '%27');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

// ── People ───────────────────────────────────────────────────────────────────

export const PEOPLE: Record<string, MessageableUser> = {
  sara:   { id: 'dev-user-sara',   firstName: 'Sara',   lastName: 'Hassan',  email: 'sara.hassan@demo.edu' },
  omar:   { id: 'dev-user-omar',   firstName: 'Omar',   lastName: 'Nabil',   email: 'omar.nabil@demo.edu' },
  karim:  { id: 'dev-user-karim',  firstName: 'Karim',  lastName: 'Fathy',   email: 'karim.fathy@demo.edu' },
  laila:  { id: 'dev-user-laila',  firstName: 'Laila',  lastName: 'Mansour', email: 'laila.mansour@demo.edu' },
  mona:   { id: 'dev-user-mona',   firstName: 'Mona',   lastName: 'Adel',    email: 'mona.adel@demo.edu' },
  youssef:{ id: 'dev-user-youssef',firstName: 'Youssef',lastName: 'Ali',     email: 'youssef.ali@demo.edu' },
  nour:   { id: 'dev-user-nour',   firstName: 'Nour',   lastName: 'Ibrahim', email: 'nour.ibrahim@demo.edu' },
};
const fullName = (p: MessageableUser) => `${p.firstName} ${p.lastName}`;

// ── Courses ──────────────────────────────────────────────────────────────────

const FALL = { academicYearId: 'dev-ay-0001', academicYearName: '2026/2027', semesterTermId: 'dev-term-0001', semesterTermName: 'Fall 2026' };
const SPRING = { academicYearId: 'dev-ay-0000', academicYearName: '2025/2026', semesterTermId: 'dev-term-0000', semesterTermName: 'Spring 2026' };

function course(c: Pick<Course, 'id' | 'code' | 'title' | 'description' | 'enrollmentType'> & Partial<Course> & { instructor: MessageableUser | null }): Course {
  const { instructor, ...rest } = c;
  return {
    institutionId: INSTITUTION_ID,
    departmentId: DEPARTMENT_ID,
    departmentName: 'Mechanical Engineering',
    departmentCode: 'MECH',
    ...FALL,
    instructorId: instructor?.id ?? 'dev-user-unassigned',
    instructorName: instructor ? `Dr. ${fullName(instructor)}` : null,
    status: 'published',
    passingGrade: 60,
    settings: {},
    startDate: daysFromNow(-35),
    endDate: daysFromNow(75),
    publishedAt: daysFromNow(-50),
    createdBy: instructor?.id ?? 'dev-user-admin',
    createdAt: daysFromNow(-60),
    updatedAt: daysFromNow(-3),
    enrolledCount: 48,
    moduleCount: 3,
    ...rest,
  };
}

export const COURSES: Course[] = [
  course({
    id: 'dev-course-1', code: 'MECH 231', title: 'Thermodynamics I', instructor: PEOPLE.sara,
    description: 'Energy, work and heat in engineering systems — properties of pure substances, the first law, and an introduction to power cycles through hands-on virtual labs.',
    enrollmentType: 'open', thumbnailUrl: thumb('#F5A04D', '#FDE8C6'), enrolledCount: 62,
  }),
  course({
    id: 'dev-course-2', code: 'MECH 241', title: 'Fluid Mechanics', instructor: PEOPLE.omar,
    description: 'Fluid statics, conservation laws and Bernoulli’s equation, pipe-flow losses, and external flow over bodies, reinforced with flow-bench simulations.',
    enrollmentType: 'open', thumbnailUrl: thumb('#7AAAC4', '#D9E8F0'), enrolledCount: 55,
  }),
  course({
    id: 'dev-course-3', code: 'MECH 215L', title: 'Engineering Materials Lab', instructor: null,
    description: 'Laboratory companion to Engineering Materials: tensile, hardness and impact testing, with pre-lab quizzes and structured lab reports.',
    enrollmentType: 'admin', enrolledCount: 24, moduleCount: 2, enrollmentCap: 24,
  }),
  course({
    id: 'dev-course-4', code: 'MECH 201', title: 'Statics & Dynamics', instructor: PEOPLE.karim,
    description: 'Equilibrium of particles and rigid bodies, trusses and frames, and the kinematics and kinetics of particles.',
    enrollmentType: 'open', thumbnailUrl: thumb('#C4C6C9', '#EEF0F2'),
    ...SPRING, startDate: daysFromNow(-240), endDate: daysFromNow(-120), enrolledCount: 71, moduleCount: 2,
  }),
  course({
    id: 'dev-course-5', code: 'MECH 351', title: 'Control Systems', instructor: PEOPLE.karim,
    description: 'Modeling dynamic systems, transfer functions, stability and feedback, and PID controller tuning on a virtual motor rig.',
    enrollmentType: 'code', thumbnailUrl: thumb('#7AAAC4', '#D9E8F0'),
    startDate: daysFromNow(3), endDate: daysFromNow(100), enrolledCount: 38, moduleCount: 2,
  }),
  course({
    id: 'dev-course-6', code: 'MECH 331', title: 'Heat Transfer', instructor: PEOPLE.laila,
    description: 'Conduction, convection and radiation with applications to fins, heat exchangers and thermal design.',
    enrollmentType: 'open', thumbnailUrl: thumb('#F5A04D', '#FDE8C6'),
    startDate: daysFromNow(14), endDate: daysFromNow(110), enrolledCount: 19, enrollmentCap: 60,
  }),
  course({
    id: 'dev-course-7', code: 'MECH 361', title: 'Machine Design', instructor: PEOPLE.laila,
    description: 'Design of machine elements — shafts, bearings, gears and fasteners — under static and fatigue loading.',
    enrollmentType: 'approval', thumbnailUrl: thumb('#C4C6C9', '#EEF0F2'), enrolledCount: 30,
  }),
  course({
    id: 'dev-course-8', code: 'MECH 390', title: 'Renewable Energy Systems', instructor: PEOPLE.omar,
    description: 'Solar, wind and storage technologies: resource assessment, conversion efficiency and system sizing.',
    enrollmentType: 'code', enrollmentCap: 40, startDate: daysFromNow(21), endDate: daysFromNow(115), enrolledCount: 12,
  }),
];

export const courseById = (id: string) => COURSES.find((c) => c.id === id);

/** Current student's enrollments, keyed by course id (mutable — enroll/unenroll). */
export const ENROLLMENTS = new Map<string, Enrollment>(
  ([
    ['dev-course-1', 'active', -34],
    ['dev-course-2', 'active', -34],
    ['dev-course-3', 'active', -30],
    ['dev-course-4', 'active', -240],
    ['dev-course-5', 'active', -5],
    ['dev-course-7', 'pending', -2],
  ] as const).map(([courseId, status, d]) => [courseId, {
    id: `dev-enr-${courseId}`, courseId, userId: STUDENT_ID, role: 'student', status,
    enrolledAt: daysFromNow(d),
  }]),
);

// ── Simulations & catalogs ───────────────────────────────────────────────────

function catalog(id: string, name: string, depth: number, parentId: string | null, children: SimulationCatalog[] = []): SimulationCatalog {
  return {
    id, name, depth, parentId, rootCatalogId: 'dev-cat-mech', status: 'active', visibility: 'institution',
    institutionId: INSTITUTION_ID, description: `${name} simulations`, children,
  };
}

export const CATALOG_TREE: SimulationCatalog[] = [
  catalog('dev-cat-mech', 'Mechanical Engineering', 0, null, [
    catalog('dev-cat-thermo', 'Thermodynamics', 1, 'dev-cat-mech', [
      catalog('dev-cat-cycles', 'Power Cycles', 2, 'dev-cat-thermo'),
    ]),
    catalog('dev-cat-fluids', 'Fluid Mechanics', 1, 'dev-cat-mech'),
    catalog('dev-cat-heat', 'Heat Transfer', 1, 'dev-cat-mech'),
    catalog('dev-cat-materials', 'Materials Science', 1, 'dev-cat-mech'),
    catalog('dev-cat-dynamics', 'Statics & Dynamics', 1, 'dev-cat-mech'),
    catalog('dev-cat-controls', 'Control Systems', 1, 'dev-cat-mech'),
  ]),
];

/** Catalog ids in the subtree rooted at `id` (inclusive). */
export function catalogSubtreeIds(id: string): string[] {
  const find = (nodes: SimulationCatalog[]): SimulationCatalog | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const hit = find(n.children ?? []);
      if (hit) return hit;
    }
  };
  const collect = (n: SimulationCatalog): string[] => [n.id, ...(n.children ?? []).flatMap(collect)];
  const node = find(CATALOG_TREE);
  return node ? collect(node) : [];
}

const CATALOG_NAME: Record<string, string> = {
  'dev-cat-thermo': 'Thermodynamics', 'dev-cat-cycles': 'Thermodynamics', 'dev-cat-fluids': 'Fluid Mechanics',
  'dev-cat-heat': 'Heat Transfer', 'dev-cat-materials': 'Materials Science', 'dev-cat-dynamics': 'Statics & Dynamics',
  'dev-cat-controls': 'Control Systems',
};

function sim(
  id: string, title: string, catalogId: string, difficulty: Simulation['difficulty'], estimatedMinutes: number,
  colors: [string, string], description: string, learningObjectives: string[], visibility: Simulation['visibility'] = 'institution',
): SimulationDetail {
  return {
    id, title, description, difficulty, estimatedMinutes, learningObjectives, visibility,
    institutionId: INSTITUTION_ID, type: 'webgl', launchType: 'webgl', buildStatus: 'ready',
    thumbnailUrl: thumb(colors[0], colors[1]),
    maxScore: 100, passScore: 60, maxAttempts: 3, scoringConfig: {}, status: 'active', version: '1.2.0',
    discipline: CATALOG_NAME[catalogId] ?? null, catalogId,
  };
}

export const SIMULATIONS: SimulationDetail[] = [
  sim('dev-sim-calorimeter', 'Bomb Calorimeter', 'dev-cat-thermo', 'beginner', 15, ['#E8894A', '#F9C98C'],
    'Burn fuel samples in a constant-volume calorimeter and determine their heating value from the measured temperature rise.',
    ['Apply an energy balance to a constant-volume process', 'Determine the higher heating value of a fuel', 'Estimate measurement uncertainty'], 'demo_public'),
  sim('dev-sim-piston', 'Piston–Cylinder Expansion', 'dev-cat-thermo', 'intermediate', 20, ['#D9713A', '#F2A774'],
    'Heat a gas in a piston–cylinder device and observe boundary work, heat transfer and internal energy change for different processes.',
    ['Compute boundary work for isobaric and polytropic processes', 'Apply the first law to a closed system', 'Read P–v diagrams']),
  sim('dev-sim-rankine', 'Rankine Cycle Power Plant', 'dev-cat-cycles', 'advanced', 35, ['#B85A2E', '#E8894A'],
    'Operate a simple steam power plant — adjust boiler pressure and condenser temperature to see how thermal efficiency responds.',
    ['Identify the four components of a Rankine cycle', 'Compute net work and thermal efficiency', 'Evaluate the effect of superheating']),
  sim('dev-sim-venturi', 'Venturi Meter Calibration', 'dev-cat-fluids', 'beginner', 15, ['#3E7FA0', '#8CC3DD'],
    'Measure pressure drop across a venturi at several flow rates and derive its discharge coefficient.',
    ['Apply Bernoulli’s equation and continuity', 'Compute the discharge coefficient', 'Plot flow rate against √Δp']),
  sim('dev-sim-pipeflow', 'Pipe Flow & Friction Losses', 'dev-cat-fluids', 'intermediate', 25, ['#2F6B8A', '#6FA8C6'],
    'Run water through pipes of different roughness and diameter to measure major and minor head losses.',
    ['Distinguish laminar and turbulent regimes', 'Use the Moody chart', 'Quantify minor losses in fittings']),
  sim('dev-sim-windtunnel', 'Wind Tunnel: Airfoil Lift & Drag', 'dev-cat-fluids', 'advanced', 30, ['#27566F', '#5C98B7'],
    'Vary angle of attack and airspeed on a NACA airfoil and record lift and drag coefficients up to stall.',
    ['Measure lift and drag forces', 'Plot C_L and C_D against angle of attack', 'Identify stall behaviour']),
  sim('dev-sim-heatex', 'Shell & Tube Heat Exchanger', 'dev-cat-heat', 'advanced', 30, ['#C2553F', '#EE9B72'],
    'Configure parallel- and counter-flow exchangers and compare effectiveness using the LMTD and NTU methods.',
    ['Apply the LMTD method', 'Compare parallel and counter flow', 'Compute exchanger effectiveness']),
  sim('dev-sim-tensile', 'Tensile Testing of Metals', 'dev-cat-materials', 'beginner', 20, ['#6B6F76', '#B3B7BD'],
    'Pull steel, aluminium and brass specimens to failure and extract their key mechanical properties from the stress–strain curve.',
    ['Plot engineering stress–strain curves', 'Determine yield strength and Young’s modulus', 'Compare ductility between metals']),
  sim('dev-sim-hardness', 'Rockwell Hardness Test', 'dev-cat-materials', 'beginner', 10, ['#7D6E5B', '#C4B39A'],
    'Perform Rockwell B and C tests on heat-treated samples and relate hardness to microstructure.',
    ['Select the correct Rockwell scale', 'Perform an indentation test', 'Relate hardness to heat treatment'], 'demo_public'),
  sim('dev-sim-beam', 'Beam Deflection Bench', 'dev-cat-dynamics', 'intermediate', 20, ['#4F7A5A', '#8DBF8F'],
    'Load simply supported and cantilever beams and compare measured deflections against theory.',
    ['Draw shear and bending-moment diagrams', 'Predict deflection with beam theory', 'Assess the effect of support conditions']),
  sim('dev-sim-pendulum', 'Compound Pendulum Dynamics', 'dev-cat-dynamics', 'intermediate', 15, ['#3F6B4B', '#79AE83'],
    'Measure the period of a compound pendulum for different pivot points and determine its radius of gyration.',
    ['Derive the equation of motion', 'Measure oscillation period', 'Compute the mass moment of inertia']),
  sim('dev-sim-pid', 'PID Motor Speed Control', 'dev-cat-controls', 'advanced', 30, ['#5B5F97', '#9A9FD6'],
    'Tune proportional, integral and derivative gains on a DC motor and observe rise time, overshoot and steady-state error.',
    ['Explain the role of each PID term', 'Tune a controller for a step response', 'Trade off overshoot against settling time']),
];

export const simById = (id: string) => SIMULATIONS.find((s) => s.id === id);

// ── Quizzes ──────────────────────────────────────────────────────────────────

function quiz(id: string, courseId: string, title: string, pointsPossible: number, dueAt: string | null, maxAttempts = 2): Quiz {
  return {
    id, courseId, title, pointsPossible, dueAt, maxAttempts,
    institutionId: INSTITUTION_ID, departmentId: DEPARTMENT_ID,
    description: 'Five questions covering the key ideas from this module.',
    instructions: 'Answer every question. Your answers are saved automatically as you go.',
    passingPercentage: 60, attemptScoringMode: 'highest', timeLimitSeconds: 20 * 60,
    shuffleQuestions: false, shuffleAnswers: false, oneQuestionAtATime: false, allowBackNavigation: true,
    showScorePolicy: 'immediately', showAnswersPolicy: 'after_final_attempt', gradeReleaseMode: 'automatic',
    availableFrom: daysFromNow(-30), availableUntil: null, status: 'published',
    createdBy: courseById(courseId)?.instructorId ?? 'dev-user-admin', createdAt: daysFromNow(-40),
  };
}

export const QUIZZES: Quiz[] = [
  quiz('dev-quiz-t1', 'dev-course-1', 'Quiz 1 — Properties of Pure Substances', 20, daysFromNow(-20)),
  quiz('dev-quiz-t2', 'dev-course-1', 'Quiz 2 — Heat Transfer', 20, daysFromNow(-1)),
  quiz('dev-quiz-1',  'dev-course-1', 'Quiz 3 — First Law', 20, daysFromNow(2)),
  quiz('dev-quiz-f1', 'dev-course-2', 'Quiz 1 — Fluid Statics', 20, daysFromNow(-15)),
  quiz('dev-quiz-2',  'dev-course-2', 'Quiz 2 — Bernoulli', 20, daysFromNow(5)),
  quiz('dev-quiz-m1', 'dev-course-3', 'Pre-lab Quiz — Crystal Structures', 20, daysFromNow(9), 1),
  quiz('dev-quiz-s1', 'dev-course-4', 'Quiz 1 — Equilibrium', 20, daysFromNow(-200)),
  quiz('dev-quiz-s2', 'dev-course-4', 'Final Quiz — Trusses & Frames', 50, daysFromNow(-125), 1),
  quiz('dev-quiz-c1', 'dev-course-5', 'Quiz 1 — Laplace Transforms', 20, daysFromNow(12)),
];

export const quizById = (id: string) => QUIZZES.find((q) => q.id === id);

/** One shared five-question bank; ids are namespaced per quiz. */
interface BankItem {
  type: QuizQuestion['questionType'];
  prompt: string;
  options?: { key: string; text: string; correct?: boolean }[];
  correct: Record<string, unknown>;
  wrong: Record<string, unknown>;
  isCorrect: (payload: Record<string, unknown>, q: QuizQuestion) => boolean;
}

const optId = (quizId: string, n: number, key: string) => `${quizId}-q${n}-${key}`;

const BANK: BankItem[] = [
  {
    type: 'single_choice', prompt: 'For an isolated system, which quantity remains constant?',
    options: [{ key: 'a', text: 'Total energy', correct: true }, { key: 'b', text: 'Entropy' }, { key: 'c', text: 'Temperature' }, { key: 'd', text: 'Pressure' }],
    correct: { selectedOptionId: 'a' }, wrong: { selectedOptionId: 'b' },
    isCorrect: (p, q) => p.selectedOptionId === q.options.find((o) => o.isCorrect)?.id,
  },
  {
    type: 'true_false', prompt: 'The SI unit of pressure is the pascal (1 Pa = 1 N/m²).',
    options: [{ key: 't', text: 'True', correct: true }, { key: 'f', text: 'False' }],
    correct: { selectedOptionId: 't' }, wrong: { selectedOptionId: 'f' },
    isCorrect: (p, q) => p.selectedOptionId === q.options.find((o) => o.isCorrect)?.id,
  },
  {
    type: 'multiple_choice', prompt: 'Select all of the following that are intensive properties.',
    options: [{ key: 'a', text: 'Temperature', correct: true }, { key: 'b', text: 'Pressure', correct: true }, { key: 'c', text: 'Volume' }, { key: 'd', text: 'Mass' }],
    correct: { selectedOptionIds: ['a', 'b'] }, wrong: { selectedOptionIds: ['a', 'c'] },
    isCorrect: (p, q) => {
      const picked = [...((p.selectedOptionIds as string[]) ?? [])].sort().join();
      return picked === q.options.filter((o) => o.isCorrect).map((o) => o.id).sort().join();
    },
  },
  {
    type: 'numeric', prompt: 'A 2 kg mass is raised 5 m. Using g = 9.81 m/s², what is its change in potential energy in joules?',
    correct: { value: 98.1 }, wrong: { value: 49.05 },
    isCorrect: (p) => typeof p.value === 'number' && Math.abs(p.value - 98.1) <= 0.5,
  },
  {
    type: 'short_text', prompt: 'Name the principle stating that energy can be neither created nor destroyed.',
    correct: { text: 'First law of thermodynamics' }, wrong: { text: 'Newton’s second law' },
    isCorrect: (p) => /first\s+law|conservation\s+of\s+energy/i.test(String(p.text ?? '')),
  },
];

/** Replace bank option keys in a payload with the namespaced option ids. */
function namespacePayload(quizId: string, n: number, payload: Record<string, unknown>) {
  if (typeof payload.selectedOptionId === 'string') return { selectedOptionId: optId(quizId, n, payload.selectedOptionId) };
  if (Array.isArray(payload.selectedOptionIds)) return { selectedOptionIds: payload.selectedOptionIds.map((k) => optId(quizId, n, k as string)) };
  return payload;
}

export function questionsFor(quizId: string): QuizQuestion[] {
  const q = quizById(quizId);
  const points = (q?.pointsPossible ?? 20) / BANK.length;
  return BANK.map((b, i) => {
    const n = i + 1;
    return {
      id: `${quizId}-q${n}`, quizId, questionType: b.type, prompt: b.prompt, title: `Question ${n}`,
      points, position: n, required: true, manualGrading: false, shuffleOptions: false,
      questionData: {}, responseDeclaration: {}, scoringConfig: {}, feedbackConfig: {},
      options: (b.options ?? []).map((o, j) => ({
        id: optId(quizId, n, o.key), optionIdentifier: o.key.toUpperCase(), content: o.text, isCorrect: !!o.correct, position: j + 1,
      })),
      createdAt: daysFromNow(-40),
    };
  });
}

/** Grades a response against the bank; returns the response with scores filled in. */
export function gradeResponse(attemptId: string, question: QuizQuestion, payload: Record<string, unknown>, at: string): QuizResponse {
  const bank = BANK[question.position - 1];
  const ok = bank.isCorrect(payload, question);
  return {
    id: `${attemptId}-${question.id}`, attemptId, questionId: question.id, responsePayload: payload,
    isCorrect: ok, autoScore: ok ? question.points : 0, finalScore: ok ? question.points : 0,
    feedback: null, answeredAt: at,
  };
}

function gradedAttempt(quizId: string, attemptNumber: number, correctCount: number, submittedDaysAgo: number): QuizAttempt {
  const q = quizById(quizId)!;
  const id = `dev-att-${quizId}-${attemptNumber}`;
  const submittedAt = daysFromNow(-submittedDaysAgo);
  const responses = questionsFor(quizId).map((question, i) => {
    const bank = BANK[i];
    const payload = namespacePayload(quizId, i + 1, i < correctCount ? bank.correct : bank.wrong);
    return gradeResponse(id, question, payload, submittedAt);
  });
  const finalScore = responses.reduce((s, r) => s + (r.finalScore ?? 0), 0);
  const percentage = Math.round((finalScore / q.pointsPossible) * 100);
  return {
    id, quizId, userId: STUDENT_ID, institutionId: INSTITUTION_ID, departmentId: DEPARTMENT_ID, courseId: q.courseId,
    lessonId: null, attemptNumber, status: 'graded', startedAt: new Date(Date.parse(submittedAt) - 14 * 60_000).toISOString(),
    submittedAt, gradedAt: submittedAt, timeSpentSeconds: 14 * 60 + attemptNumber * 37,
    autoScore: finalScore, finalScore, pointsPossible: q.pointsPossible, percentage, passed: percentage >= (q.passingPercentage ?? 60),
    createdAt: submittedAt, responses,
  };
}

/** All of the student's quiz attempts (mutable — start/save/submit). */
export const ATTEMPTS: QuizAttempt[] = [
  gradedAttempt('dev-quiz-t1', 1, 4, 20),
  gradedAttempt('dev-quiz-t2', 1, 3, 3),
  gradedAttempt('dev-quiz-t2', 2, 5, 1),
  gradedAttempt('dev-quiz-f1', 1, 3, 15),
  gradedAttempt('dev-quiz-s1', 1, 5, 200),
  gradedAttempt('dev-quiz-s2', 1, 4, 125),
];

// ── Course structure (modules → lessons) ─────────────────────────────────────

interface LessonSpec {
  title: string;
  mode: LessonMode;
  contentType?: ContentType;
  content?: Record<string, unknown>;
  simulationId?: string;
  quizId?: string;
  minutes: number;
  done?: boolean;
}

interface ModuleSpec {
  title: string;
  description: string;
  /** Locked until every lesson of the previous module is complete. */
  gated?: boolean;
  unlockAt?: string;
  lessons: LessonSpec[];
}

const text = (body: string) => ({ contentType: 'rich_text' as const, content: { body } });
const video = () => ({ contentType: 'video' as const, content: { url: '/VLE%20Video.mp4', mime_type: 'video/mp4' } });
const link = (url: string) => ({ contentType: 'url' as const, content: { url } });

const COURSE_OUTLINES: Record<string, ModuleSpec[]> = {
  'dev-course-1': [
    {
      title: 'Foundations & Properties', description: 'Systems, states and the properties of pure substances.',
      lessons: [
        { title: 'Welcome & Course Overview', mode: 'content', ...text('<h2>Welcome to Thermodynamics I</h2><p>This course builds your intuition for <strong>energy, work and heat</strong> through short readings, virtual labs and weekly quizzes.</p><ul><li>Weekly quiz every Thursday</li><li>Two simulation labs per module</li><li>Office hours: Sundays 12:00–14:00</li></ul>'), minutes: 5, done: true },
        { title: 'Systems, States & Processes', mode: 'content', ...video(), minutes: 12, done: true },
        { title: 'Properties of Pure Substances', mode: 'content_and_simulation', ...text('<p>Use the calorimeter lab to see how a substance stores energy. Record the temperature rise for each fuel sample.</p>'), simulationId: 'dev-sim-calorimeter', minutes: 25, done: true },
        { title: 'Quiz 1 — Properties of Pure Substances', mode: 'quiz', quizId: 'dev-quiz-t1', minutes: 20, done: true },
      ],
    },
    {
      title: 'Energy & Heat Transfer', description: 'Work and heat interactions and the modes of heat transfer.',
      lessons: [
        { title: 'Work & Heat Interactions', mode: 'content', ...text('<p>Work and heat are <em>energy in transit</em>. Neither is a property of the system — both depend on the path of the process.</p><p>Boundary work for a quasi-equilibrium process is <code>W = ∫ P dV</code>.</p>'), minutes: 15, done: true },
        { title: 'Modes of Heat Transfer (reading)', mode: 'content', ...link('https://en.wikipedia.org/wiki/Heat_transfer'), minutes: 10, done: true },
        { title: 'Quiz 2 — Heat Transfer', mode: 'quiz', quizId: 'dev-quiz-t2', minutes: 20, done: true },
        { title: 'Piston–Cylinder Expansion Lab', mode: 'simulation', simulationId: 'dev-sim-piston', minutes: 20, done: true },
      ],
    },
    {
      title: 'The First Law', description: 'Energy balances for closed systems and an introduction to power cycles.', gated: true,
      lessons: [
        { title: 'First Law for Closed Systems', mode: 'content', ...text('<p>For a closed system: <strong>Q − W = ΔU + ΔKE + ΔPE</strong>. In this lesson we apply the balance to rigid tanks and piston–cylinder devices.</p>'), minutes: 15 },
        { title: 'Rankine Cycle Walkthrough', mode: 'content_and_simulation', ...text('<p>Run the power-plant simulation and record the thermal efficiency at three boiler pressures.</p>'), simulationId: 'dev-sim-rankine', minutes: 35 },
        { title: 'Quiz 3 — First Law', mode: 'quiz', quizId: 'dev-quiz-1', minutes: 20 },
      ],
    },
  ],
  'dev-course-2': [
    {
      title: 'Fluid Statics', description: 'Pressure, manometry and hydrostatic forces.',
      lessons: [
        { title: 'Fluid Properties & Pressure', mode: 'content', ...text('<p>Pressure in a static fluid increases linearly with depth: <strong>P = P₀ + ρgh</strong>.</p>'), minutes: 12, done: true },
        { title: 'Manometry', mode: 'content', ...video(), minutes: 10, done: true },
        { title: 'Quiz 1 — Fluid Statics', mode: 'quiz', quizId: 'dev-quiz-f1', minutes: 20, done: true },
      ],
    },
    {
      title: 'Fluid Dynamics', description: 'Continuity, Bernoulli and flow measurement.',
      lessons: [
        { title: 'Continuity & Bernoulli', mode: 'content', ...text('<p>Along a streamline in steady, incompressible, inviscid flow: <strong>P + ½ρV² + ρgz = constant</strong>.</p>'), minutes: 15, done: true },
        { title: 'Venturi Meter Calibration', mode: 'simulation', simulationId: 'dev-sim-venturi', minutes: 15, done: true },
        { title: 'Quiz 2 — Bernoulli', mode: 'content_and_quiz', ...text('<p>Review the continuity and Bernoulli notes before starting the quiz.</p>'), quizId: 'dev-quiz-2', minutes: 20 },
        { title: 'Pipe Flow & Friction Losses', mode: 'simulation', simulationId: 'dev-sim-pipeflow', minutes: 25 },
      ],
    },
    {
      title: 'Internal & External Flow', description: 'Laminar and turbulent flow, and flow over bodies.', gated: true,
      lessons: [
        { title: 'Laminar vs Turbulent Flow', mode: 'content', ...text('<p>The Reynolds number <strong>Re = ρVD/μ</strong> predicts the flow regime.</p>'), minutes: 12 },
        { title: 'Reading the Moody Chart', mode: 'content', ...link('https://en.wikipedia.org/wiki/Moody_chart'), minutes: 10 },
        { title: 'Airfoil Lift & Drag', mode: 'simulation', simulationId: 'dev-sim-windtunnel', minutes: 30 },
        { title: 'Module Review', mode: 'content', ...text('<p>Summary of internal and external flow concepts.</p>'), minutes: 8 },
      ],
    },
  ],
  'dev-course-3': [
    {
      title: 'Lab Safety & Orientation', description: 'Safety rules and pre-lab preparation.',
      lessons: [
        { title: 'Lab Safety Briefing', mode: 'content', ...video(), minutes: 10, done: true },
        { title: 'Pre-lab Quiz — Crystal Structures', mode: 'quiz', quizId: 'dev-quiz-m1', minutes: 15 },
      ],
    },
    {
      title: 'Mechanical Testing', description: 'Tensile and hardness testing of metals.', gated: true,
      lessons: [
        { title: 'Tensile Testing of Metals', mode: 'content_and_simulation', ...text('<p>Test all three specimens and export the stress–strain data for your report.</p>'), simulationId: 'dev-sim-tensile', minutes: 20 },
        { title: 'Rockwell Hardness Test', mode: 'simulation', simulationId: 'dev-sim-hardness', minutes: 10 },
        { title: 'Lab Report Guidelines', mode: 'content', ...text('<p>Reports follow the standard format: objective, method, results, discussion, conclusion.</p>'), minutes: 8 },
      ],
    },
  ],
  'dev-course-4': [
    {
      title: 'Force Systems & Equilibrium', description: 'Resultants, free-body diagrams and equilibrium.',
      lessons: [
        { title: 'Force Vectors & Resultants', mode: 'content', ...text('<p>Resolve forces into components and sum them to find the resultant.</p>'), minutes: 12, done: true },
        { title: 'Free-Body Diagrams', mode: 'content', ...video(), minutes: 15, done: true },
        { title: 'Quiz 1 — Equilibrium', mode: 'quiz', quizId: 'dev-quiz-s1', minutes: 20, done: true },
      ],
    },
    {
      title: 'Structures & Beams', description: 'Trusses, frames and beam deflection.',
      lessons: [
        { title: 'Method of Joints & Sections', mode: 'content', ...text('<p>Solve truss member forces using the method of joints and the method of sections.</p>'), minutes: 15, done: true },
        { title: 'Beam Deflection Bench', mode: 'simulation', simulationId: 'dev-sim-beam', minutes: 20, done: true },
        { title: 'Final Quiz — Trusses & Frames', mode: 'quiz', quizId: 'dev-quiz-s2', minutes: 30, done: true },
      ],
    },
  ],
  'dev-course-5': [
    {
      title: 'Modeling Dynamic Systems', description: 'Transfer functions and the Laplace transform.',
      lessons: [
        { title: 'Course Introduction', mode: 'content', ...text('<p>Welcome to Control Systems. We start by modeling mechanical and electrical systems as transfer functions.</p>'), minutes: 5 },
        { title: 'Laplace Transforms Refresher', mode: 'content', ...video(), minutes: 15 },
        { title: 'Quiz 1 — Laplace Transforms', mode: 'quiz', quizId: 'dev-quiz-c1', minutes: 20 },
      ],
    },
    {
      title: 'Feedback & PID Control', description: 'Closed-loop behaviour and controller tuning.', unlockAt: daysFromNow(10),
      lessons: [
        { title: 'Block Diagrams & Feedback', mode: 'content', ...text('<p>Closed-loop transfer function: <strong>T(s) = G(s) / (1 + G(s)H(s))</strong>.</p>'), minutes: 15 },
        { title: 'PID Motor Speed Control', mode: 'simulation', simulationId: 'dev-sim-pid', minutes: 30 },
      ],
    },
  ],
  'dev-course-6': [
    { title: 'Conduction', description: 'Fourier’s law and extended surfaces.', lessons: [
      { title: 'Fourier’s Law', mode: 'content', ...text('<p>q = −k ∇T</p>'), minutes: 12 },
      { title: 'Fins & Extended Surfaces', mode: 'content', ...text('<p>Fin efficiency and effectiveness.</p>'), minutes: 15 },
    ] },
    { title: 'Convection', description: 'Forced and natural convection; heat exchangers.', gated: true, lessons: [
      { title: 'Convection Correlations', mode: 'content', ...text('<p>Nusselt number correlations for internal and external flow.</p>'), minutes: 15 },
      { title: 'Shell & Tube Heat Exchanger', mode: 'simulation', simulationId: 'dev-sim-heatex', minutes: 30 },
    ] },
    { title: 'Radiation', description: 'Blackbody radiation and view factors.', gated: true, lessons: [
      { title: 'Blackbody Radiation', mode: 'content', ...text('<p>Stefan–Boltzmann law: E = σT⁴.</p>'), minutes: 12 },
    ] },
  ],
  'dev-course-7': [
    { title: 'Design Fundamentals', description: 'Failure theories and factors of safety.', lessons: [
      { title: 'Static Failure Theories', mode: 'content', ...text('<p>Von Mises and Tresca criteria.</p>'), minutes: 15 },
      { title: 'Fatigue Basics', mode: 'content', ...text('<p>S–N curves and endurance limit.</p>'), minutes: 15 },
    ] },
    { title: 'Shafts & Bearings', description: 'Shaft sizing and bearing selection.', gated: true, lessons: [
      { title: 'Shaft Design', mode: 'content', ...text('<p>Combined bending and torsion.</p>'), minutes: 20 },
    ] },
    { title: 'Gears', description: 'Spur and helical gear design.', gated: true, lessons: [
      { title: 'Spur Gear Geometry', mode: 'content', ...text('<p>Pitch circle, module and pressure angle.</p>'), minutes: 15 },
    ] },
  ],
  'dev-course-8': [
    { title: 'Solar Energy', description: 'Solar resource and photovoltaics.', lessons: [
      { title: 'Solar Resource Assessment', mode: 'content', ...text('<p>Irradiance, insolation and panel orientation.</p>'), minutes: 15 },
    ] },
    { title: 'Wind Energy', description: 'Aerodynamics of wind turbines.', gated: true, lessons: [
      { title: 'Betz Limit', mode: 'content', ...text('<p>The maximum extractable power is 16/27 of the wind’s kinetic energy flux.</p>'), minutes: 12 },
      { title: 'Airfoil Lift & Drag', mode: 'simulation', simulationId: 'dev-sim-windtunnel', minutes: 30 },
    ] },
    { title: 'Energy Storage', description: 'Batteries, pumped hydro and thermal storage.', gated: true, lessons: [
      { title: 'Storage Technologies Compared', mode: 'content', ...text('<p>Energy density, efficiency and cost.</p>'), minutes: 15 },
    ] },
  ],
};

const moduleId = (courseId: string, m: number) => `${courseId}-m${m + 1}`;
const lessonId = (courseId: string, m: number, l: number) => `${courseId}-m${m + 1}-l${l + 1}`;

/** Completed lesson ids for the student (mutable — "mark complete"). */
export const COMPLETED_LESSONS = new Set<string>(
  Object.entries(COURSE_OUTLINES).flatMap(([courseId, mods]) =>
    mods.flatMap((m, mi) => m.lessons.flatMap((l, li) => (l.done ? [lessonId(courseId, mi, li)] : []))),
  ),
);

export function buildJourney(courseId: string): CourseJourney | null {
  const c = courseById(courseId);
  if (!c) return null;
  const outline = COURSE_OUTLINES[courseId] ?? [];

  const modules: JourneyModule[] = [];
  outline.forEach((m, mi) => {
    const prev = modules[mi - 1];
    const prevDone = !prev || prev.lessons.every((l) => l.completionStatus === 'completed');
    const timeLocked = !!m.unlockAt && Date.parse(m.unlockAt) > Date.now();
    const isLocked = timeLocked || (!!m.gated && !prevDone);

    const lessons: JourneyLesson[] = m.lessons.map((l, li) => {
      const id = lessonId(courseId, mi, li);
      const s = l.simulationId ? simById(l.simulationId) : undefined;
      const q = l.quizId ? quizById(l.quizId) : undefined;
      return {
        id, moduleId: moduleId(courseId, mi), title: l.title, lessonMode: l.mode,
        contentType: l.contentType ?? null, content: l.content ?? {},
        simulationId: l.simulationId ?? null, quizId: l.quizId ?? null,
        estimatedMinutes: l.minutes, isRequired: true, isPublished: true, isLocked,
        completionStatus: COMPLETED_LESSONS.has(id) ? 'completed' : 'not_started',
        simulation: s ? {
          id: s.id, title: s.title, description: s.description, estimatedMinutes: s.estimatedMinutes,
          difficulty: s.difficulty, type: s.type, thumbnailUrl: s.thumbnailUrl, launchType: s.launchType, buildStatus: s.buildStatus,
        } : null,
        quiz: q ? {
          id: q.id, title: q.title, description: q.description, pointsPossible: q.pointsPossible,
          passingPercentage: q.passingPercentage, maxAttempts: q.maxAttempts, timeLimitSeconds: q.timeLimitSeconds,
          dueAt: q.dueAt, availableFrom: q.availableFrom, availableUntil: q.availableUntil, status: q.status,
        } : null,
        position: li + 1,
      };
    });

    modules.push({
      id: moduleId(courseId, mi), courseId, title: m.title, description: m.description, position: mi + 1,
      isPublished: true, isLocked, unlockAt: m.unlockAt ?? null,
      prerequisiteModuleId: m.gated && mi > 0 ? moduleId(courseId, mi - 1) : null, lessons,
    });
  });

  const all = modules.flatMap((m) => m.lessons);
  const completed = all.filter((l) => l.completionStatus === 'completed').length;
  return {
    course: {
      id: c.id, title: c.title, description: c.description, departmentId: c.departmentId, academicYearId: c.academicYearId,
      semesterTermId: c.semesterTermId, status: c.status, departmentName: c.departmentName,
      academicYearName: c.academicYearName, semesterTermName: c.semesterTermName,
    },
    progress: { percentage: all.length ? Math.round((completed / all.length) * 100) : 0, completedLessons: completed, totalLessons: all.length },
    modules,
  };
}

/** Instructor-style module tree (used by the course detail page's syllabus). */
export function buildCourseTree(courseId: string): CourseModule[] {
  const journey = buildJourney(courseId);
  if (!journey) return [];
  return journey.modules.map((m) => ({
    id: m.id, courseId, title: m.title, description: m.description ?? undefined, position: m.position,
    isPublished: m.isPublished, unlockAt: m.unlockAt, prerequisiteModuleId: m.prerequisiteModuleId,
    lessons: m.lessons.map((l): Lesson => ({
      id: l.id, moduleId: m.id, courseId, title: l.title, lessonMode: l.lessonMode, contentType: l.contentType,
      content: l.content, simulationId: l.simulationId, quizId: l.quizId, position: l.position,
      estimatedMinutes: l.estimatedMinutes, isRequired: l.isRequired, isPublished: l.isPublished,
    })),
  }));
}


// ── Simulation activity ──────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}h ${m}m` : `${m}m ${s}s`;
}

const SESSION_SPECS: [lessonId: string, hoursAgo: number, seconds: number, status: SimulationActivitySession['status']][] = [
  ['dev-course-2-m2-l4', 50, 1512, 'ended'],
  ['dev-course-1-m2-l4', 70, 1385, 'ended'],
  ['dev-course-1-m2-l4', 74, 402, 'abandoned'],
  ['dev-course-2-m2-l2', 150, 947, 'ended'],
  ['dev-course-1-m1-l3', 480, 1620, 'ended'],
  ['dev-course-1-m3-l2', 26, 540, 'expired'],
  ['dev-course-4-m2-l2', 2950, 1260, 'ended'],
];

export const ACTIVITY_SESSIONS: SimulationActivitySession[] = SESSION_SPECS.flatMap(([lid, h, secs, status], i) => {
  const [courseId, m, l] = lid.match(/^(dev-course-\d+)-m(\d+)-l(\d+)$/)!.slice(1);
  const spec = COURSE_OUTLINES[courseId]?.[+m - 1];
  const lesson = spec?.lessons[+l - 1];
  const s = lesson?.simulationId ? simById(lesson.simulationId) : undefined;
  if (!spec || !lesson || !s) return [];
  const startedAt = hoursAgo(h);
  return [{
    id: `dev-session-${i + 1}`, courseId, courseTitle: courseById(courseId)?.title ?? null,
    moduleId: moduleId(courseId, +m - 1), moduleTitle: spec.title, lessonId: lid, lessonTitle: lesson.title,
    simulationId: s.id, simulationTitle: s.title, startedAt,
    endedAt: status === 'expired' ? null : new Date(Date.parse(startedAt) + secs * 1000).toISOString(),
    durationSeconds: secs, formattedDuration: formatDuration(secs), status,
    exitReason: status === 'ended' ? 'user_exit' : status === 'abandoned' ? 'browser_close' : status === 'expired' ? 'timeout' : null,
  }];
});

export function latestSessionForLesson(lessonId: string): LatestActivitySession | null {
  const s = ACTIVITY_SESSIONS
    .filter((x) => x.lessonId === lessonId && x.status === 'ended')
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  return s ? { id: s.id, startedAt: s.startedAt, endedAt: s.endedAt, durationSeconds: s.durationSeconds, formattedDuration: s.formattedDuration, status: s.status } : null;
}

// ── Notifications ────────────────────────────────────────────────────────────

function notif(
  n: number, type: string, title: string, body: string, hours: number, isRead: boolean,
  extra: Partial<Notification> = {},
): Notification {
  return {
    id: `dev-notif-${n}`, type, title, body, priority: 'normal', channel: 'in_app',
    status: isRead ? 'read' : 'unread', isRead, readAt: isRead ? hoursAgo(hours - 1) : null,
    institutionId: INSTITUTION_ID, createdAt: hoursAgo(hours), ...extra,
  };
}

/** Mutable — mark read / archive / delete. */
export const NOTIFICATIONS: Notification[] = [
  notif(1, 'quiz.due', 'Quiz 3 — First Law is due in 2 days', 'Thermodynamics I · 20 points · 2 attempts allowed', 2, false,
    { priority: 'high', courseId: 'dev-course-1', data: { actionUrl: '/courses/dev-course-1/home' } }),
  notif(2, 'message.received', 'New message from Dr. Omar Nabil', 'Re: Pipe-flow lab data — please re-upload your CSV…', 5, false,
    { data: { actionUrl: '/mail/inbox' } }),
  notif(3, 'grade.posted', 'Grade posted: Quiz 2 — Heat Transfer', 'You scored 20 / 20 (100%) on your second attempt.', 24, false,
    { courseId: 'dev-course-1', data: { actionUrl: '/gradebook' } }),
  notif(4, 'course.announcement', 'Materials Lab session moved to Thursday', 'This week’s tensile-testing session moves to Thursday 10:00 in Lab B2.', 30, false,
    { courseId: 'dev-course-3', data: { actionUrl: '/courses/dev-course-3/home' } }),
  notif(5, 'enrollment.pending', 'Enrollment request received — Machine Design', 'Your request is waiting for instructor approval.', 50, true,
    { courseId: 'dev-course-7', data: { actionUrl: '/courses/dev-course-7' } }),
  notif(6, 'simulation.added', 'New simulation available: Rankine Cycle Power Plant', 'Added to the Thermodynamics › Power Cycles catalog.', 96, true,
    { data: { actionUrl: '/simulations/dev-sim-rankine' } }),
  notif(7, 'system.maintenance', 'Scheduled maintenance on Saturday', 'SimuLearn will be unavailable Saturday 02:00–04:00.', 144, true,
    { priority: 'low' }),
  notif(8, 'grade.posted', 'Final grade released — Statics & Dynamics', 'Your final grade is 91%. Congratulations on completing the course!', 2880, true,
    { courseId: 'dev-course-4', data: { actionUrl: '/gradebook' } }),
];

// ── Mail ─────────────────────────────────────────────────────────────────────

export interface MockMail {
  id: string;
  threadId: string;
  from: MessageableUser;
  to: MessageableUser[];
  cc?: MessageableUser[];
  subject: string;
  body: string;
  courseId?: string;
  folder: MailFolder;
  isRead: boolean;
  messageType?: MailListItem['messageType'];
  attachments?: { fileName: string; fileUrl: string; fileType: string; fileSize: number }[];
  at: string;
  /** Earlier messages in the thread (oldest first), shown under the message. */
  history?: MailThreadMessage[];
}

const ME: MessageableUser = { id: STUDENT_ID, firstName: MOCK_STUDENT_USER.firstName, lastName: MOCK_STUDENT_USER.lastName, email: MOCK_STUDENT_USER.email };
export const MOCK_ME = ME;

/** Mutable — read state, folder moves, new messages. */
export const MAILS: MockMail[] = [
  {
    id: 'dev-mail-1', threadId: 'dev-thread-1', from: PEOPLE.omar, to: [ME], folder: 'inbox', isRead: false, at: hoursAgo(5),
    subject: 'Re: Pipe-flow lab data', courseId: 'dev-course-2', messageType: 'reply',
    body: 'Hi Demo,\n\nThanks for sending your results. The CSV you attached seems to be missing the last three flow-rate readings — could you re-run the pipe-flow simulation for the 25 mm pipe and re-upload?\n\nBest,\nDr. Omar Nabil',
    history: [{ id: 'dev-mail-1-h1', senderId: STUDENT_ID, senderName: 'Demo Student', subject: 'Pipe-flow lab data', body: 'Dear Dr. Nabil,\n\nPlease find my pipe-flow lab data attached.\n\nThank you,\nDemo', messageType: 'normal', sentAt: hoursAgo(30), createdAt: hoursAgo(30) }],
  },
  {
    id: 'dev-mail-2', threadId: 'dev-thread-2', from: PEOPLE.mona, to: [ME], cc: [PEOPLE.youssef, PEOPLE.nour], folder: 'inbox', isRead: false, at: hoursAgo(20),
    subject: 'Lab group assignments — Materials Lab', courseId: 'dev-course-3',
    body: 'Hello everyone,\n\nYou are in Group 3 with Youssef and Nour. Please review the safety briefing video before Thursday’s session and complete the pre-lab quiz.\n\nEng. Mona Adel (TA)',
    attachments: [{ fileName: 'Lab-groups-Fall-2026.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 182_400 }],
  },
  {
    id: 'dev-mail-3', threadId: 'dev-thread-3', from: PEOPLE.sara, to: [ME], folder: 'inbox', isRead: true, at: hoursAgo(52), messageType: 'announcement',
    subject: 'Quiz 3 opens tomorrow', courseId: 'dev-course-1',
    body: 'Dear students,\n\nQuiz 3 on the First Law opens tomorrow at 09:00 and is due in two days. You have two attempts; your highest score counts.\n\nGood luck,\nDr. Sara Hassan',
  },
  {
    id: 'dev-mail-4', threadId: 'dev-thread-4', from: PEOPLE.youssef, to: [ME], folder: 'inbox', isRead: true, at: hoursAgo(75),
    subject: 'Study group this weekend?',
    body: 'Hey! A few of us are meeting Saturday at the library to go over fluid statics. Want to join?\n\nYoussef',
  },
  {
    id: 'dev-mail-5', threadId: 'dev-thread-5', from: PEOPLE.karim, to: [ME], folder: 'inbox', isRead: true, at: hoursAgo(120),
    subject: 'Control Systems enrollment code', courseId: 'dev-course-5',
    body: 'Welcome to MECH 351. The course starts in a few days — the first module covers Laplace transforms, so please review them beforehand.\n\nProf. Karim Fathy',
  },
  {
    id: 'dev-mail-6', threadId: 'dev-thread-6', from: { id: 'dev-user-system', firstName: 'SimuLearn', lastName: 'System', email: 'no-reply@demo.edu' }, to: [ME], folder: 'inbox', isRead: true, at: hoursAgo(300), messageType: 'system',
    subject: 'Welcome to SimuLearn',
    body: 'Your account is ready. Explore your courses, launch simulations and track your progress from the dashboard.',
  },
  {
    id: 'dev-mail-7', threadId: 'dev-thread-1', from: ME, to: [PEOPLE.omar], folder: 'sent', isRead: true, at: hoursAgo(30),
    subject: 'Pipe-flow lab data', courseId: 'dev-course-2',
    body: 'Dear Dr. Nabil,\n\nPlease find my pipe-flow lab data attached.\n\nThank you,\nDemo',
    attachments: [{ fileName: 'pipe-flow-results.csv', fileUrl: '#', fileType: 'text/csv', fileSize: 4_812 }],
  },
  {
    id: 'dev-mail-8', threadId: 'dev-thread-8', from: ME, to: [PEOPLE.sara], folder: 'sent', isRead: true, at: hoursAgo(98),
    subject: 'Question about boundary work sign convention', courseId: 'dev-course-1',
    body: 'Dr. Hassan,\n\nIn lecture 4 the boundary work was positive for expansion, but the textbook example uses the opposite sign. Which convention should we use in the quiz?\n\nThanks,\nDemo',
  },
  {
    id: 'dev-mail-9', threadId: 'dev-thread-9', from: ME, to: [PEOPLE.mona], folder: 'draft', isRead: true, at: hoursAgo(3),
    subject: 'Lab report extension', courseId: 'dev-course-3',
    body: 'Hi Eng. Mona,\n\nWould it be possible to get a one-day extension on the tensile lab report? I',
  },
  {
    id: 'dev-mail-10', threadId: 'dev-thread-10', from: PEOPLE.nour, to: [ME], folder: 'archived', isRead: true, at: hoursAgo(400),
    subject: 'Shared notes — Statics final',
    body: 'Here are my summary notes for the statics final. Good luck!',
    attachments: [{ fileName: 'statics-summary.pdf', fileUrl: '#', fileType: 'application/pdf', fileSize: 1_204_000 }],
  },
];

// ── Gradebook helpers ────────────────────────────────────────────────────────

/** Best graded attempt per quiz (quizzes use "highest" scoring). */
export function bestAttempt(quizId: string): QuizAttempt | undefined {
  return ATTEMPTS
    .filter((a) => a.quizId === quizId && a.status === 'graded')
    .sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0))[0];
}

/** Deterministic simulation lab score for a completed simulation lesson. */
export function simLabScore(lessonId: string): number {
  let h = 0;
  for (const ch of lessonId) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 78 + (h % 20);
}

export const PARTICIPATION_SCORES: Record<string, number> = { 'dev-course-4': 10, 'dev-course-1': 9 };

export { STUDENT_ID, INSTITUTION_ID, DEPARTMENT_ID };

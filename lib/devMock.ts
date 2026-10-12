/**
 * DEV ONLY — fake student / instructor / admin session so the UI can be viewed without the
 * backend/PostgreSQL running. Page data comes from lib/devMockApi.ts.
 * Enabled by NEXT_PUBLIC_DEV_MOCK_AUTH=true in .env.local; never set it in production.
 */

import type { User } from '@/types';

export const DEV_MOCK_AUTH =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_MOCK_AUTH === 'true';

const now = Date.now();
const daysFromNow = (d: number) => new Date(now + d * 86_400_000).toISOString();

export const MOCK_STUDENT_USER: User = {
  id: 'dev-student-0001',
  email: 'student@dev.local',
  firstName: 'Demo',
  lastName: 'Student',
  status: 'active',
  roles: [{ id: 'role-student', name: 'student', label: 'Student' }],
  permissions: [
    'courses.view_own',
    'simulations.view_catalog',
    'grades.view_own',
    'messages.send',
    'messages.view',
    'notifications.view',
  ],
  createdAt: daysFromNow(-120),
};

/** Owns dev-course-2 (Fluid Mechanics) and dev-course-8 in lib/devMockData.ts. */
export const MOCK_INSTRUCTOR_USER: User = {
  id: 'dev-user-omar',
  email: 'omar.nabil@demo.edu',
  firstName: 'Omar',
  lastName: 'Nabil',
  status: 'active',
  roles: [{ id: 'role-instructor', name: 'instructor', label: 'Instructor' }],
  permissions: [
    'courses.view_own',
    'courses.create',
    'simulations.view_catalog',
    'simulations.launch',
    'grades.view_course',
    'grades.edit_course',
    'users.view_course',
    'messages.send',
    'messages.view',
    'notifications.view',
  ],
  createdAt: daysFromNow(-400),
};

// Admin accounts — same institution and department as lib/devMockData.ts.
const DEV_INSTITUTION_ID = 'dev-inst-0001';
const DEV_DEPARTMENT_ID = 'dev-dept-0001';

export const MOCK_SUPER_ADMIN_USER: User = {
  id: 'dev-user-superadmin',
  email: 'superadmin@dev.local',
  firstName: 'Sara',
  lastName: 'Hassan',
  status: 'active',
  roles: [{ id: 'role-super-admin', name: 'super_admin', label: 'Super Admin' }],
  permissions: [
    'courses.view_all', 'simulations.view_catalog', 'simulation_catalogs.manage_global',
    'users.view_all', 'institutions.view_all', 'roles.manage', 'platform.settings.manage',
    'platform.audit.view', 'platform.reports.view', 'lti_platforms.view_all',
    'grades.view_course', 'grades.edit_course',
    'messages.send', 'messages.view', 'notifications.view',
  ],
  createdAt: daysFromNow(-900),
};

export const MOCK_INSTITUTION_ADMIN_USER: User = {
  id: 'dev-user-instadmin',
  email: 'admin@demo.edu',
  firstName: 'Karim',
  lastName: 'Mostafa',
  status: 'active',
  institutionId: DEV_INSTITUTION_ID,
  roles: [{ id: 'role-institution-admin', name: 'institution_admin', label: 'Institution Admin' }],
  permissions: [
    'courses.view_institution', 'simulations.view_catalog', 'simulation_catalogs.view_assigned',
    'grades.view_department', 'users.view_institution', 'institutions.view_own', 'institutions.manage_own',
    'audit.view_institution', 'lti_platforms.view_own',
    'messages.send', 'messages.view', 'notifications.view',
  ],
  createdAt: daysFromNow(-700),
};

export const MOCK_DEPT_MANAGER_USER: User = {
  id: 'dev-user-deptmanager',
  email: 'dept.manager@demo.edu',
  firstName: 'Mona',
  lastName: 'Adel',
  status: 'active',
  institutionId: DEV_INSTITUTION_ID,
  managedDepartments: [DEV_DEPARTMENT_ID],
  roles: [{ id: 'role-dept-manager', name: 'dept_manager', label: 'Department Manager' }],
  permissions: [
    'courses.view_department', 'simulations.view_catalog', 'simulation_catalogs.view_assigned',
    'grades.view_department', 'users.view_department',
    'messages.send', 'messages.view', 'notifications.view',
  ],
  createdAt: daysFromNow(-500),
};

const MOCK_USERS: Record<string, User> = {
  student: MOCK_STUDENT_USER,
  instructor: MOCK_INSTRUCTOR_USER,
  super_admin: MOCK_SUPER_ADMIN_USER,
  institution_admin: MOCK_INSTITUTION_ADMIN_USER,
  dept_manager: MOCK_DEPT_MANAGER_USER,
};

const ROLE_KEY = 'devMockRole';

/**
 * Which mock account to sign in as. Switch with `?mockRole=` on any URL —
 * student · instructor · super_admin · institution_admin · dept_manager. The
 * choice is remembered in localStorage.
 */
export function getDevMockUser(): User {
  if (typeof window === 'undefined') return MOCK_STUDENT_USER;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('mockRole');
    if (fromUrl) window.localStorage.setItem(ROLE_KEY, fromUrl);
    const role = fromUrl ?? window.localStorage.getItem(ROLE_KEY);
    return MOCK_USERS[role ?? ''] ?? MOCK_STUDENT_USER;
  } catch {
    return MOCK_STUDENT_USER;
  }
}

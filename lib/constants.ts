// SRS §4.1: token TTLs, pagination defaults, role lists.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://172.20.44.1:5000/api/v1';

export const ACCESS_TOKEN_KEY = 'sl_access_token';  // in-memory only (never localStorage)

export const ROLES = {
  SUPER_ADMIN:       'super_admin',
  INSTITUTION_ADMIN: 'institution_admin',
  DEPT_MANAGER:      'dept_manager',
  INSTRUCTOR:        'instructor',
  TEACHING_ASSISTANT:'teaching_assistant',
  STUDENT:           'student',
  GUEST:             'guest',
} as const;

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN] as const;
export const INSTRUCTOR_ROLES = [ROLES.INSTRUCTOR, ROLES.TEACHING_ASSISTANT] as const;
export const STAFF_ROLES = [...ADMIN_ROLES, ROLES.DEPT_MANAGER, ...INSTRUCTOR_ROLES] as const;

/** Roles that institution_admin (and above) can assign. */
export const ASSIGNABLE_ROLES = [
  ROLES.DEPT_MANAGER, ROLES.INSTRUCTOR, ROLES.TEACHING_ASSISTANT, ROLES.STUDENT, ROLES.GUEST,
] as const;

/** Roles only super_admin can assign. */
export const SUPER_ONLY_ROLES = [ROLES.SUPER_ADMIN, ROLES.INSTITUTION_ADMIN] as const;

export const PERMISSIONS = {
  // Platform
  PLATFORM_MANAGE:        'platform.manage',
  PLATFORM_SETTINGS:      'platform.settings.manage',
  PLATFORM_AUDIT:         'platform.audit.view',
  PLATFORM_REPORTS:       'platform.reports.view',
  // Institutions
  INSTITUTIONS_CREATE:    'institutions.create',
  INSTITUTIONS_VIEW_ALL:  'institutions.view_all',
  INSTITUTIONS_MANAGE_ALL:'institutions.manage_all',
  INSTITUTIONS_VIEW_OWN:  'institutions.view_own',
  INSTITUTIONS_MANAGE_OWN:'institutions.manage_own',
  INSTITUTIONS_ASSIGN_ADMIN: 'institutions.assign_admin',
  // Departments
  DEPARTMENTS_CREATE:     'departments.create',
  DEPARTMENTS_VIEW:       'departments.view',
  DEPARTMENTS_MANAGE:     'departments.manage',
  // Users
  USERS_CREATE:           'users.create',
  USERS_VIEW_ALL:         'users.view_all',
  USERS_VIEW_INSTITUTION: 'users.view_institution',
  USERS_VIEW_DEPARTMENT:  'users.view_department',
  USERS_VIEW_COURSE:      'users.view_course',
  USERS_ASSIGN_ROLES:     'users.assign_roles',
  USERS_SUSPEND:          'users.suspend',
  USERS_DELETE:           'users.delete',
  // Roles
  ROLES_MANAGE:           'roles.manage',
  // Courses
  COURSES_CREATE:         'courses.create',
  COURSES_VIEW_ALL:       'courses.view_all',
  COURSES_VIEW_INSTITUTION:'courses.view_institution',
  COURSES_VIEW_DEPARTMENT:'courses.view_department',
  COURSES_VIEW_OWN:       'courses.view_own',
  // Simulations
  SIMULATIONS_VIEW_CATALOG: 'simulations.view_catalog',
  SIMULATIONS_VIEW_DEMO:    'simulations.view_demo',
  SIMULATIONS_LAUNCH:       'simulations.launch',
  // Simulation Catalogs
  SIM_CATALOGS_MANAGE:    'simulation_catalogs.manage_global',
  SIM_CATALOGS_ASSIGN:    'simulation_catalogs.assign_to_institution',
  SIM_CATALOGS_VIEW:      'simulation_catalogs.view_assigned',
  // Grades
  GRADES_VIEW_OWN:        'grades.view_own',
  GRADES_VIEW_COURSE:     'grades.view_course',
  GRADES_VIEW_DEPARTMENT: 'grades.view_department',
  // Audit
  AUDIT_VIEW_INSTITUTION: 'audit.view_institution',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SIMULATION_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const COURSE_STATUSES = ['draft', 'published', 'archived'] as const;

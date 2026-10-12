/**
 * Notification display mapping — presentation only.
 *
 * Maps a notification's `type` (backend template key, e.g. `quiz_attempt.graded`)
 * and the viewer's role to a badge, tone, icon key, contextual action label and
 * role-appropriate type label. No behaviour lives here: read/archive/navigation
 * stay in the page, and `data.actionUrl` remains the only navigation target.
 */

import type { Notification, User, UserRole } from '@/types';

export type NotificationAudience = 'student' | 'instructor' | 'institution_admin' | 'super_admin';
export type NotificationBadge = 'Simulation' | 'Quiz' | 'Course' | 'Grade' | 'Message' | 'System' | 'Catalog' | 'LTI';
/** info = blue · action = orange · success = green · critical = red */
export type NotificationTone = 'info' | 'action' | 'success' | 'critical';

export interface NotificationDisplay {
  badge: NotificationBadge;
  tone: NotificationTone;
  /** Role-appropriate name for this kind of notification (used in the type filter). */
  typeLabel: string;
  /** Label for the contextual action; null when there is nowhere useful to go. */
  actionLabel: string | null;
  /** Course / simulation / institution name pulled from the stored template vars. */
  context: string | null;
}

export const TONE_STYLE: Record<NotificationTone, { fg: string; bg: string }> = {
  info:     { fg: '#2F5A70', bg: '#EDF4F8' },
  action:   { fg: '#B45309', bg: '#FEF3E2' },
  success:  { fg: '#065F46', bg: '#D1FAE5' },
  critical: { fg: '#991B1B', bg: '#FEE2E2' },
};

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 0, institution_admin: 1, dept_manager: 2,
  instructor: 3, teaching_assistant: 4, student: 5, guest: 6,
};

/** Picks the wording set from the user's highest-ranked role (same order as /dashboard). */
export function audienceFor(user: User | null): NotificationAudience {
  if (!user?.roles.length) return 'student';
  const top = user.roles.reduce((best, r) => (ROLE_RANK[r.name] < ROLE_RANK[best.name] ? r : best), user.roles[0]).name;
  if (top === 'super_admin') return 'super_admin';
  if (top === 'institution_admin' || top === 'dept_manager') return 'institution_admin';
  if (top === 'instructor' || top === 'teaching_assistant') return 'instructor';
  return 'student';
}

interface TypeSpec {
  badge: NotificationBadge;
  tone: NotificationTone;
  action: string | null;
  /** Per-audience label; `default` covers audiences not listed. */
  label: Partial<Record<NotificationAudience, string>> & { default: string };
}

/** Keyed by the backend template names in notification-templates.js. */
const TYPE_SPECS: Record<string, TypeSpec> = {
  'course.published':            { badge: 'Course', tone: 'info', action: 'Open Course', label: { default: 'Course published' } },
  'enrollment.confirmed':        { badge: 'Course', tone: 'success', action: 'Open Course', label: { default: 'Enrollment confirmed' } },
  'enrollment.approved':         { badge: 'Course', tone: 'success', action: 'Open Course', label: { default: 'Enrollment approved' } },
  'enrollment.rejected':         { badge: 'Course', tone: 'info', action: 'View Course', label: { default: 'Enrollment declined' } },
  'enrollment.pending_approval': { badge: 'Course', tone: 'action', action: 'Review Request', label: { default: 'Enrollment request', institution_admin: 'User task pending' } },
  'module.published':            { badge: 'Course', tone: 'info', action: 'Open Course', label: { default: 'New module available', instructor: 'Course activity update' } },
  'lesson.published':            { badge: 'Course', tone: 'info', action: 'Open Course', label: { default: 'New lesson available', instructor: 'Course activity update' } },
  'course_announcement.posted':  { badge: 'Course', tone: 'info', action: 'View Announcement', label: { default: 'Course update' } },
  'quiz.published':              { badge: 'Quiz', tone: 'action', action: 'View Quiz', label: { default: 'Quiz available', student: 'Quiz due' } },
  'quiz_attempt.manual_grading_required': { badge: 'Quiz', tone: 'action', action: 'Grade Attempt', label: { default: 'Quiz pending grading' } },
  'quiz_attempt.graded':         { badge: 'Quiz', tone: 'success', action: 'Review Result', label: { default: 'Quiz graded' } },
  'grade.posted':                { badge: 'Grade', tone: 'success', action: 'View Grade', label: { default: 'Grade posted' } },
  'grade.overridden':            { badge: 'Grade', tone: 'info', action: 'View Grade', label: { default: 'Grade updated' } },
  'simulation.completed':        { badge: 'Simulation', tone: 'success', action: 'View Simulation', label: { default: 'Simulation completed', instructor: 'Simulation activity' } },
  'message.new':                 { badge: 'Message', tone: 'info', action: 'Open Message', label: { default: 'Message received', instructor: 'Student message', institution_admin: 'User message' } },
  'system.alert':                { badge: 'System', tone: 'critical', action: 'View Alert', label: { default: 'System alert' } },
};

/** Types offered in the Type filter per role, in priority order for that role. */
const AUDIENCE_TYPES: Record<NotificationAudience, string[]> = {
  student: [
    'quiz.published', 'quiz_attempt.graded', 'grade.posted', 'grade.overridden', 'simulation.completed',
    'lesson.published', 'module.published', 'course_announcement.posted', 'message.new',
    'enrollment.approved', 'enrollment.confirmed', 'enrollment.rejected', 'system.alert',
  ],
  instructor: [
    'quiz_attempt.manual_grading_required', 'enrollment.pending_approval', 'simulation.completed',
    'message.new', 'course_announcement.posted', 'course.published', 'lesson.published', 'module.published',
    'system.alert',
  ],
  institution_admin: [
    'enrollment.pending_approval', 'course.published', 'message.new', 'course_announcement.posted', 'system.alert',
  ],
  super_admin: [
    'system.alert', 'course.published', 'message.new',
  ],
};

/** Best-effort classification for types the frontend has no explicit spec for. */
function inferSpec(type: string): TypeSpec {
  const t = type.toLowerCase();
  const humanised = type.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const failed = /fail|error|suspend/.test(t);
  const make = (badge: NotificationBadge, tone: NotificationTone, action: string | null): TypeSpec =>
    ({ badge, tone: failed ? 'critical' : tone, action, label: { default: humanised } });

  if (t.includes('lti'))                          return make('LTI', 'info', 'View Details');
  if (t.includes('catalog'))                      return make('Catalog', 'info', 'View Catalog');
  if (t.includes('webgl') || t.includes('build')) return make('Simulation', 'info', 'View Build');
  if (t.startsWith('simulation'))                 return make('Simulation', 'info', 'View Simulation');
  if (t.startsWith('quiz'))                       return make('Quiz', 'info', 'View Quiz');
  if (t.startsWith('grade'))                      return make('Grade', 'info', 'View Grade');
  if (t.startsWith('message') || t.startsWith('mail')) return make('Message', 'info', 'Open Message');
  if (t.startsWith('course') || t.startsWith('lesson') || t.startsWith('module') || t.startsWith('enrollment'))
    return make('Course', 'info', 'Open Course');
  if (t.startsWith('institution') || t.startsWith('system') || t.startsWith('platform'))
    return make('System', 'info', 'View Details');
  return make('System', 'info', 'Open');
}

function specFor(type: string): TypeSpec {
  return TYPE_SPECS[type] ?? inferSpec(type);
}

function pickString(data: Notification['data'], ...keys: string[]): string | null {
  for (const k of keys) {
    const v = data?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export function typeLabel(type: string, audience: NotificationAudience): string {
  const { label } = specFor(type);
  return label[audience] ?? label.default;
}

export function describeNotification(n: Notification, audience: NotificationAudience): NotificationDisplay {
  const spec = specFor(n.type);
  const hasUrl = typeof n.data?.actionUrl === 'string' && n.data.actionUrl.length > 0;
  // Urgent items read as critical unless the type itself is a success message.
  const tone: NotificationTone = n.priority === 'urgent' && spec.tone !== 'success' ? 'critical' : spec.tone;
  return {
    badge: spec.badge,
    tone,
    typeLabel: spec.label[audience] ?? spec.label.default,
    actionLabel: hasUrl ? spec.action : null,
    context: pickString(n.data, 'courseTitle', 'simulationTitle', 'institutionName', 'catalogName'),
  };
}

/** Type filter options: the role's known types first, then any other type seen on the current page. */
export function typeFilterOptions(audience: NotificationAudience, seen: string[]) {
  const ordered = [...AUDIENCE_TYPES[audience], ...seen.filter((t) => !AUDIENCE_TYPES[audience].includes(t))];
  return Array.from(new Set(ordered)).map((t) => ({ value: t, label: typeLabel(t, audience) }));
}

export function isImportant(n: Notification): boolean {
  return n.priority === 'high' || n.priority === 'urgent';
}

// ── Time ─────────────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export type DateGroup = 'Today' | 'This week' | 'Earlier';

/** Groups an already newest-first list into Today / This week / Earlier, preserving order. */
export function groupByDate(items: Notification[]): { label: DateGroup; items: Notification[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000;

  const groups: Record<DateGroup, Notification[]> = { Today: [], 'This week': [], Earlier: [] };
  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday.getTime()) groups.Today.push(n);
    else if (t >= weekAgo) groups['This week'].push(n);
    else groups.Earlier.push(n);
  }
  return (['Today', 'This week', 'Earlier'] as DateGroup[])
    .filter((label) => groups[label].length)
    .map((label) => ({ label, items: groups[label] }));
}

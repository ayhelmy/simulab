'use client';

/**
 * Presentational building blocks for the student learning flow (dashboard,
 * catalog, course detail, course home, quiz attempt). No data fetching here —
 * only consistent badges, labels and progress, per BEDO_DESIGN_SYSTEM.md §10 / §19.
 */

import type { CSSProperties, ReactNode } from 'react';
import type { LessonMode } from '@/types';
import {
  FileTextOutlined, ExperimentOutlined, FormOutlined, MergeCellsOutlined,
} from '@ant-design/icons';
import s from './StudentLearning.module.css';

export { s as learningStyles };

// ── Chip ─────────────────────────────────────────────────────────────────────

export type ChipTone = 'neutral' | 'info' | 'primary' | 'success' | 'warning' | 'error';

const TONE_CLASS: Record<ChipTone, string> = {
  neutral: s.chipNeutral,
  info: s.chipInfo,
  primary: s.chipPrimary,
  success: s.chipSuccess,
  warning: s.chipWarning,
  error: s.chipError,
};

export function Chip({
  tone = 'neutral', icon, children, className, style,
}: { tone?: ChipTone; icon?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={[s.chip, TONE_CLASS[tone], className].filter(Boolean).join(' ')} style={style}>
      {icon}
      {children}
    </span>
  );
}

// ── Lesson type ──────────────────────────────────────────────────────────────

/** Student-facing activity type names. Simulations are never presented as video. */
export const LESSON_TYPE_LABEL: Record<LessonMode, string> = {
  content: 'Content',
  simulation: 'Interactive Simulation',
  quiz: 'Quiz',
  content_and_simulation: 'Content + Simulation',
  content_and_quiz: 'Content + Quiz',
  simulation_and_quiz: 'Simulation + Quiz',
  content_simulation_and_quiz: 'Content + Simulation + Quiz',
};

export function lessonTypeIcon(mode: LessonMode, style?: CSSProperties) {
  if (mode === 'simulation') return <ExperimentOutlined style={style} />;
  if (mode === 'quiz') return <FormOutlined style={style} />;
  if (mode.includes('_and_')) return <MergeCellsOutlined style={style} />;
  return <FileTextOutlined style={style} />;
}

/**
 * Activity type colour: simulations are blue (technical fact); quizzes and content
 * are gray. A type label describes the activity — orange stays reserved for the
 * primary action and the current-activity highlight (section 10.1).
 */
export function lessonTypeTone(mode: LessonMode): ChipTone {
  if (mode.includes('simulation')) return 'info';
  return 'neutral';
}

export function LessonTypeChip({ mode, small }: { mode: LessonMode; small?: boolean }) {
  return (
    <Chip tone={lessonTypeTone(mode)} icon={lessonTypeIcon(mode)} className={small ? s.chipSm : undefined}>
      {LESSON_TYPE_LABEL[mode]}
    </Chip>
  );
}

// ── Locked activities and workspace links ────────────────────────────────────

/** Why an activity is locked, in student words. `short` is for tight rows (tree, lists). */
export function lockMessage(unlockAt: string | null | undefined, short = false): string {
  if (unlockAt && new Date(unlockAt) > new Date()) {
    return `Opens ${new Date(unlockAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return short ? 'Locked' : 'Locked until previous required activities are completed';
}

/** Course workspace link; the selected activity is kept in `?activity=`. */
export function activityHref(courseId: string, lessonId?: string | null): string {
  return lessonId
    ? `/courses/${courseId}/home?activity=${encodeURIComponent(lessonId)}`
    : `/courses/${courseId}/home`;
}

// ── Learning state (course or module progress) ───────────────────────────────

export type LearningState = 'not_started' | 'in_progress' | 'completed';

export function learningState(percent: number | null | undefined): LearningState {
  if (percent == null || percent <= 0) return 'not_started';
  if (percent >= 100) return 'completed';
  return 'in_progress';
}

const STATE_META: Record<LearningState, { label: string; tone: ChipTone }> = {
  not_started: { label: 'Not started', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
};

export function StateChip({ state }: { state: LearningState }) {
  const m = STATE_META[state];
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

// ── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({
  percent, label, className,
}: { percent: number; label?: ReactNode; className?: string }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={[s.progress, className].filter(Boolean).join(' ')}>
      <div
        className={s.progressTrack}
        role="progressbar"
        aria-valuenow={p}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : `${p}% complete`}
      >
        <div className={[s.progressFill, p >= 100 ? s.progressFillDone : ''].join(' ')} style={{ width: `${p}%` }} />
      </div>
      <span className={s.progressLabel}>{label ?? `${p}%`}</span>
    </div>
  );
}

// ── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return withTime
    ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Due-date chip rule from section 19.2: overdue red, within 48h orange, later gray. */
export function dueStatus(dueAt: string | null | undefined): { label: string; tone: ChipTone; overdue: boolean } {
  if (!dueAt) return { label: 'No due date', tone: 'neutral', overdue: false };
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (due < now) return { label: 'Overdue', tone: 'error', overdue: true };
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  if (days === 0) return { label: 'Due today', tone: 'primary', overdue: false };
  if (days === 1) return { label: 'Due tomorrow', tone: 'primary', overdue: false };
  if (days === 2) return { label: 'Due in 2 days', tone: 'primary', overdue: false };
  return { label: `Due ${new Date(dueAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`, tone: 'neutral', overdue: false };
}

export function DueChip({ dueAt }: { dueAt: string | null | undefined }) {
  const d = dueStatus(dueAt);
  return <Chip tone={d.tone}>{d.label}</Chip>;
}

// ── Label/value tile ─────────────────────────────────────────────────────────

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={s.fact}>
      <span className={s.factLabel}>{label}</span>
      <span className={s.factValue}>{value}</span>
    </div>
  );
}

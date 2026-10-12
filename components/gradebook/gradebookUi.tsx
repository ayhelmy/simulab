'use client';

/**
 * Presentational pieces for the role-aware Gradebook: status and type chips,
 * summary cards and the CSV builder. No data fetching here — the page owns it.
 * BEDO_DESIGN_SYSTEM.md §10.1 (badge colours), §18.6 (KPI cards), §20.7 (export).
 */

import type { ReactNode } from 'react';
import type { GradeItemType } from '@/types';
import { Tooltip } from 'antd';
import {
  ExperimentOutlined, FormOutlined, FileTextOutlined, TeamOutlined,
} from '@ant-design/icons';
import { Chip, type ChipTone } from '@/components/student/studentUi';
import g from './Gradebook.module.css';

export { g as gradebookStyles };

// ── Row model ────────────────────────────────────────────────────────────────

/**
 * Display status, derived only from data the gradebook endpoints already return:
 *   score present                → passed / failed against the course passing grade
 *                                  (or plain "graded" when the course has none)
 *   grade row without a score    → needs_review (recorded, awaiting a score)
 *   no grade row, due date past  → missing
 *   no grade row otherwise       → not_submitted
 */
export type GradeStatus = 'passed' | 'failed' | 'graded' | 'needs_review' | 'missing' | 'not_submitted';

export interface GradeRow {
  key: string;
  studentId?: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  departmentName: string | null;
  instructorName: string | null;
  institutionId: string | null;
  passingGrade: number | null;
  itemId: string;
  itemTitle: string;
  itemType: GradeItemType;
  lessonId: string | null;
  dueDate: string | null;
  gradeId: string | null;
  score: number | null;
  maxPoints: number;
  percentage: number | null;
  gradedAt: string | null;
  isOverride: boolean;
  status: GradeStatus;
  quizId?: string | null;
  simulationId?: string | null;
  quizAttemptId?: string | null;
  simulationScoreId?: string | null;
}

export function deriveStatus(
  hasGradeRow: boolean, pct: number | null, dueDate: string | null | undefined, passingGrade: number | null,
): GradeStatus {
  if (pct != null) {
    if (passingGrade != null && passingGrade > 0) return pct >= passingGrade ? 'passed' : 'failed';
    return 'graded';
  }
  if (hasGradeRow) return 'needs_review';
  if (dueDate && new Date(dueDate).getTime() < Date.now()) return 'missing';
  return 'not_submitted';
}

export const isGraded = (s: GradeStatus) => s === 'passed' || s === 'failed' || s === 'graded';

/** Review link for a graded quiz attempt or simulation score, when one exists. */
export function reviewHref(row: GradeRow): string | null {
  if (row.itemType === 'quiz' && row.quizId && row.quizAttemptId) {
    return `/courses/${row.courseId}/quizzes/${row.quizId}/attempts/${row.quizAttemptId}/review`;
  }
  if (row.itemType === 'simulation' && row.simulationScoreId) {
    return `/courses/${row.courseId}/simulation-scores/${row.simulationScoreId}/review`;
  }
  return null;
}

// ── Status chip ──────────────────────────────────────────────────────────────

const STATUS_META: Record<GradeStatus, { label: string; studentLabel?: string; tone: ChipTone }> = {
  passed: { label: 'Passed', tone: 'success' },
  failed: { label: 'Failed', tone: 'error' },
  graded: { label: 'Graded', tone: 'success' },
  needs_review: { label: 'Needs Review', studentLabel: 'Pending', tone: 'warning' },
  missing: { label: 'Missing', tone: 'error' },
  not_submitted: { label: 'Not Submitted', tone: 'neutral' },
};

export function statusText(status: GradeStatus, forStudent = false): string {
  const m = STATUS_META[status];
  return (forStudent && m.studentLabel) || m.label;
}

export function GradeStatusChip({ row, forStudent }: { row: GradeRow; forStudent?: boolean }) {
  const m = STATUS_META[row.status];
  const chip = <Chip tone={m.tone}>{statusText(row.status, forStudent)}</Chip>;
  if ((row.status === 'passed' || row.status === 'failed') && row.passingGrade != null) {
    return <Tooltip title={`Against the course passing grade of ${row.passingGrade}%`}>{chip}</Tooltip>;
  }
  if (row.status === 'missing' && row.dueDate) {
    return <Tooltip title={`Was due ${new Date(row.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}>{chip}</Tooltip>;
  }
  return chip;
}

/** Status filter options; "graded" matches passed, failed and graded. */
export function statusFilterOptions(forStudent: boolean) {
  return [
    { value: 'graded', label: 'Graded' },
    { value: 'passed', label: 'Passed' },
    { value: 'failed', label: 'Failed' },
    { value: 'needs_review', label: forStudent ? 'Pending' : 'Needs Review' },
    { value: 'missing', label: 'Missing' },
    { value: 'not_submitted', label: 'Not Submitted' },
  ];
}

export function matchesStatus(row: GradeRow, filter: string | undefined): boolean {
  if (!filter) return true;
  if (filter === 'graded') return isGraded(row.status);
  return row.status === filter;
}

// ── Type chip ────────────────────────────────────────────────────────────────

/** Simulations are blue (technical); quizzes and other items are gray (§10.1). */
const TYPE_META: Record<GradeItemType, { label: string; tone: ChipTone; icon: ReactNode }> = {
  quiz: { label: 'Quiz', tone: 'neutral', icon: <FormOutlined /> },
  simulation: { label: 'Simulation', tone: 'info', icon: <ExperimentOutlined /> },
  assignment: { label: 'Assignment', tone: 'neutral', icon: <FileTextOutlined /> },
  participation: { label: 'Participation', tone: 'neutral', icon: <TeamOutlined /> },
};

export const typeLabel = (t: GradeItemType) => TYPE_META[t]?.label ?? t;

export function GradeTypeChip({ type }: { type: GradeItemType }) {
  const m = TYPE_META[type] ?? { label: type, tone: 'neutral' as ChipTone, icon: null };
  return <Chip tone={m.tone} icon={m.icon}>{m.label}</Chip>;
}

/** Only offer the types that actually occur in the loaded rows. */
export function typeFilterOptions(rows: GradeRow[]) {
  const present = new Set(rows.map((r) => r.itemType));
  return (Object.keys(TYPE_META) as GradeItemType[])
    .filter((t) => present.has(t))
    .map((t) => ({ value: t, label: TYPE_META[t].label }));
}

// ── Score cell ───────────────────────────────────────────────────────────────

export function ScoreCell({ row }: { row: GradeRow }) {
  if (row.score == null) return <span style={{ color: 'var(--ac-text-muted)' }}>—</span>;
  return (
    <span className={g.scoreCell} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span>
        {row.score}
        <span className={g.scoreMax}> / {row.maxPoints}</span>
      </span>
      {row.isOverride && <span className={g.scoreMax}>Overridden</span>}
    </span>
  );
}

export function PercentCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: 'var(--ac-text-muted)' }}>—</span>;
  return <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--ac-text-primary)' }}>{Math.round(pct)}%</span>;
}

// ── Summary cards ────────────────────────────────────────────────────────────

export interface KpiItem {
  key: string;
  label: string;
  icon?: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: ChipTone;
  /** Clicking filters the table to this subset (§20.6). */
  onClick?: () => void;
  active?: boolean;
}

export function KpiRow({ items, loading }: { items: KpiItem[]; loading?: boolean }) {
  return (
    <div className={g.kpis}>
      {items.map((k) => {
        const body = (
          <>
            <span className={g.kpiLabel}>{k.icon}{k.label}</span>
            <span className={g.kpiValue}>{loading ? '—' : k.value ?? '—'}</span>
            {k.sub && !loading && <span className={g.kpiSub}>{k.sub}</span>}
          </>
        );
        return k.onClick ? (
          <button key={k.key} type="button" className={g.kpi} data-tone={k.tone} onClick={k.onClick} aria-pressed={!!k.active}>
            {body}
          </button>
        ) : (
          <div key={k.key} className={g.kpi} data-tone={k.tone}>{body}</div>
        );
      })}
    </div>
  );
}

// ── Aggregates ───────────────────────────────────────────────────────────────

export function averagePct(rows: GradeRow[]): number | null {
  const graded = rows.filter((r) => r.percentage != null);
  if (!graded.length) return null;
  return Math.round(graded.reduce((s, r) => s + (r.percentage ?? 0), 0) / graded.length);
}

// ── CSV export (the current filtered set, §20.7) ─────────────────────────────

export interface CsvColumn {
  header: string;
  value: (row: GradeRow) => string | number | null | undefined;
}

export function downloadCsv(rows: GradeRow[], columns: CsvColumn[], filename: string) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => esc(c.header)).join(','),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')),
  ];
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

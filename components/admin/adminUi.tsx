'use client';

/**
 * Presentational building blocks for the Super Admin / platform operations
 * console: page header, section/table cards with a toolbar, status chips,
 * and the empty / error / no-match states that replace bare "No data".
 * No data fetching here — BEDO_DESIGN_SYSTEM.md §18, §21.
 */

import type { CSSProperties, ReactNode } from 'react';
import { Button } from 'antd';
import {
  ReloadOutlined, InboxOutlined, WarningOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { Chip, learningStyles as ls, type ChipTone } from '@/components/student/studentUi';
import a from './AdminConsole.module.css';

export { a as adminStyles };

/** Root class for an admin page: console tokens + the shared Chip tokens. */
export const ADMIN_PAGE_CLASS = `${ls.page} ${a.console}`;

// ── Page header ──────────────────────────────────────────────────────────────

/** Eyebrow for the signed-in admin's scope; never "Platform" for institution roles. */
function useDefaultEyebrow(): string | null {
  const { hasRole } = useAuth();
  if (hasRole('super_admin')) return 'Platform Administration';
  if (hasRole('institution_admin')) return 'Institution Administration';
  return null;
}

export function AdminHeader({
  eyebrow: eyebrowProp, title, subtitle, badges, actions,
}: {
  /** Omit for the role default; `null` hides it. */
  eyebrow?: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Chips next to the title (status, type…). */
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  const defaultEyebrow = useDefaultEyebrow();
  const eyebrow = eyebrowProp === undefined ? defaultEyebrow : eyebrowProp;
  return (
    <header className={a.header}>
      <div className={a.headerText}>
        {eyebrow && <span className={a.eyebrow}>{eyebrow}</span>}
        <div className={a.titleRow}>
          <h1 className={a.title}>{title}</h1>
          {badges}
        </div>
        {subtitle && <p className={a.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={a.headerActions}>{actions}</div>}
    </header>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────

export function AdminCard({
  title, icon, helper, extra, toolbar, children, flush, className, style, id,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  helper?: ReactNode;
  extra?: ReactNode;
  /** Rendered between the header and the body — search, filters, refresh. */
  toolbar?: ReactNode;
  children: ReactNode;
  /** Body without padding — for tables that run edge to edge. */
  flush?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} className={[a.card, flush ? a.table : '', className].filter(Boolean).join(' ')} style={style} aria-labelledby={headingId}>
      {(title || extra) && (
        <div className={a.cardHead}>
          <div style={{ minWidth: 0 }}>
            {title && <h2 className={a.cardTitle} id={headingId}>{icon}{title}</h2>}
            {helper && <span className={a.cardHelper}>{helper}</span>}
          </div>
          {extra}
        </div>
      )}
      {toolbar}
      {flush ? children : <div className={a.cardBody}>{children}</div>}
    </section>
  );
}

/** Search first, filters next, count / refresh / action on the right (§13.1). */
export function Toolbar({
  search, filters, end,
}: { search?: ReactNode; filters?: ReactNode; end?: ReactNode }) {
  return (
    <div className={a.toolbar} role="search">
      {search && <div className={a.toolbarSearch}>{search}</div>}
      {filters}
      {end && <div className={a.toolbarEnd}>{end}</div>}
    </div>
  );
}

export function ToolbarFilter({ children }: { children: ReactNode }) {
  return <div className={a.toolbarFilter}>{children}</div>;
}

export function ResultCount({ shown, total, noun, plural }: { shown?: number; total: number | null | undefined; noun: string; plural?: string }) {
  if (total == null) return null;
  const label = `${total.toLocaleString()} ${total === 1 ? noun : plural ?? `${noun}s`}`;
  return <span className={a.resultCount} aria-live="polite">{shown != null && shown < total ? `Showing ${shown} of ${label}` : label}</span>;
}

// ── Status chip ──────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, ChipTone> = {
  active: 'success',
  ready: 'success',
  published: 'success',
  suspended: 'error',
  failed: 'error',
  pending: 'warning',
  draft: 'warning',
  processing: 'info',
  archived: 'neutral',
  inactive: 'neutral',
  retired: 'neutral',
  deprecated: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  failed: 'Build failed',
  ready: 'Ready',
};

export function statusLabel(status: string): string {
  const s = status.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One chip per status — always a word (§10.1, §21.5). */
export function StatusChip({ status, label, tone }: { status: string | null | undefined; label?: string; tone?: ChipTone }) {
  if (!status) return <span className={a.muted}>—</span>;
  return <Chip tone={tone ?? STATUS_TONE[status] ?? 'neutral'}>{label ?? STATUS_LABEL[status] ?? statusLabel(status)}</Chip>;
}

/** WebGL build status uses build vocabulary rather than the generic one. */
export function BuildChip({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const map: Record<string, { label: string; tone: ChipTone }> = {
    ready: { label: 'Build ready', tone: 'success' },
    processing: { label: 'Processing', tone: 'info' },
    failed: { label: 'Build failed', tone: 'error' },
  };
  const m = map[status] ?? { label: statusLabel(status), tone: 'neutral' as ChipTone };
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

// ── Empty / error / no-match states ──────────────────────────────────────────

type StateKind = 'empty' | 'error' | 'no-match' | 'info';

export function StateBlock({
  kind = 'empty', icon, title, text, actions, compact,
}: {
  kind?: StateKind;
  icon?: ReactNode;
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const defaultIcon = kind === 'error' ? <WarningOutlined /> : kind === 'no-match' ? <SearchOutlined /> : <InboxOutlined />;
  return (
    <div
      className={[a.state, compact ? a.stateCompact : '', kind === 'error' ? a.stateError : '', kind === 'info' ? a.stateInfo : ''].filter(Boolean).join(' ')}
      role={kind === 'error' ? 'alert' : undefined}
    >
      <span className={a.stateIcon} aria-hidden>{icon ?? defaultIcon}</span>
      <p className={a.stateTitle}>{title}</p>
      {text && <p className={a.stateText}>{text}</p>}
      {actions && <div className={a.stateActions}>{actions}</div>}
    </div>
  );
}

/** Load failure with Retry (re-runs the load) and Refresh (reloads the page). */
export function LoadErrorState({
  title = 'Could not load data',
  text = 'Something went wrong while loading this section.',
  detail,
  onRetry,
  compact,
}: {
  title?: string;
  text?: string;
  /** The server's own message, shown under the explanation when present. */
  detail?: string | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  // Our own "Failed to load …" fallbacks repeat the title; only show real server detail.
  const showDetail = !!detail && !/^failed to load/i.test(detail);
  return (
    <StateBlock
      kind="error"
      compact={compact}
      title={title}
      text={<>{text}{showDetail && <><br /><span style={{ fontSize: 12 }}>Details: {detail}</span></>}</>}
      actions={
        <>
          {onRetry && <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>Retry</Button>}
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </>
      }
    />
  );
}

/** Error state framed in its own card, for page-level failures. */
export function LoadErrorCard(props: Parameters<typeof LoadErrorState>[0]) {
  return <div className={a.stateCard}><LoadErrorState {...props} /></div>;
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export interface MetricRowItem {
  label: string;
  value: number | string | null | undefined;
  tone?: ChipTone;
}

/** One card per subject (Institutions, Users…): a lead number + supporting rows. */
export function MetricGroup({
  title, icon, lead, leadLabel, rows, link,
}: {
  title: string;
  icon: ReactNode;
  lead: number | string | null | undefined;
  leadLabel: string;
  rows: MetricRowItem[];
  link?: ReactNode;
}) {
  return (
    <section className={a.metricGroup} aria-label={title}>
      <div className={a.metricGroupHead}>
        <h3 className={a.metricGroupTitle}>
          <span className={a.metricGroupIcon} aria-hidden>{icon}</span>
          {title}
        </h3>
        {link}
      </div>
      <span className={a.metricLead}>{lead ?? '—'}</span>
      <span className={a.metricLeadLabel}>{leadLabel}</span>
      <dl className={a.metricRows}>
        {rows.map((r) => (
          <div key={r.label} className={a.metricRow} data-tone={r.tone}>
            <dt>{r.label}</dt>
            <dd>{r.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StatTile({ label, value, tone, icon }: { label: string; value: ReactNode; tone?: ChipTone; icon?: ReactNode }) {
  return (
    <div className={a.tile} data-tone={tone}>
      <span className={a.tileLabel}>{icon}{label}</span>
      <span className={a.tileValue}>{value ?? '—'}</span>
    </div>
  );
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** Relative under 7 days, otherwise a short date (§21.4). */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

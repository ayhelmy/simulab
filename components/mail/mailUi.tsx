'use client';

/**
 * Presentational helpers for the Messages workspace (Inbox / Sent / Drafts /
 * Archived / Trash, compose and message detail): role-aware copy, folder
 * metadata, context badges and dates. No data fetching here —
 * BEDO_DESIGN_SYSTEM.md §10, §13, §21.
 */

import { createContext, useContext, type ReactNode } from 'react';
import {
  InboxOutlined, SendOutlined, FileTextOutlined, FolderOutlined, DeleteOutlined,
  BookOutlined, NotificationOutlined, SoundOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { Chip } from '@/components/student/studentUi';
import type { MailFolder, MailFolderCounts, MailMessageType } from '@/types';
import m from './Mail.module.css';

export { m as mailStyles };

// ── Role ─────────────────────────────────────────────────────────────────────

export type MailRole = 'student' | 'instructor' | 'institution' | 'platform';

export function useMailRole(): MailRole {
  const { hasRole } = useAuth();
  if (hasRole('super_admin')) return 'platform';
  if (hasRole('institution_admin') || hasRole('dept_manager')) return 'institution';
  if (hasRole('instructor') || hasRole('teaching_assistant')) return 'instructor';
  return 'student';
}

export const MAIL_COPY: Record<MailRole, { subtitle: string; search: string; composeHelper: string }> = {
  student: {
    subtitle: 'Course messages, instructor replies, and platform notifications.',
    search: 'Search messages or course updates...',
    composeHelper: 'Ask your instructor or support team about a course, quiz, or simulation.',
  },
  instructor: {
    subtitle: 'Student messages, course questions, and teaching communication.',
    search: 'Search students, subjects, or course messages...',
    composeHelper: 'Message a student, course group, or institution admin.',
  },
  institution: {
    subtitle: 'Institution messages, user communication, and administrative updates.',
    search: 'Search messages, users, or institutions...',
    composeHelper: 'Message users, instructors, or platform support.',
  },
  platform: {
    subtitle: 'Platform messages, institution communication, and system follow-up.',
    search: 'Search messages, users, or institutions...',
    composeHelper: 'Message institutions or platform users.',
  },
};

/** Students open the learning view of a course; staff open course management. */
export function courseHref(role: MailRole, courseId: string): string {
  return role === 'student' ? `/courses/${courseId}/home` : `/courses/${courseId}`;
}

// ── Folders ──────────────────────────────────────────────────────────────────

export interface FolderMeta {
  folder: MailFolder;
  href: string;
  label: string;
  icon: ReactNode;
  emptyTitle: string;
  emptyText: string;
}

export const FOLDERS: FolderMeta[] = [
  {
    folder: 'inbox', href: '/mail/inbox', label: 'Inbox', icon: <InboxOutlined />,
    emptyTitle: 'No messages yet', emptyText: 'New messages and course updates will appear here.',
  },
  {
    folder: 'sent', href: '/mail/sent', label: 'Sent', icon: <SendOutlined />,
    emptyTitle: 'No sent messages', emptyText: 'Messages you send will appear here.',
  },
  {
    folder: 'draft', href: '/mail/drafts', label: 'Drafts', icon: <FileTextOutlined />,
    emptyTitle: 'No drafts', emptyText: 'Saved drafts will appear here.',
  },
  {
    folder: 'archived', href: '/mail/archived', label: 'Archived', icon: <FolderOutlined />,
    emptyTitle: 'No archived messages', emptyText: 'Messages you archive will appear here.',
  },
  {
    folder: 'trash', href: '/mail/trash', label: 'Trash', icon: <DeleteOutlined />,
    emptyTitle: 'Trash is empty', emptyText: 'Deleted messages will appear here before permanent removal.',
  },
];

export function folderMeta(folder: MailFolder): FolderMeta {
  return FOLDERS.find((f) => f.folder === folder) ?? FOLDERS[0];
}

/** The number shown beside a folder: unread for Inbox, total for Drafts. */
export function folderCount(folder: MailFolder, counts: MailFolderCounts | null): number {
  if (!counts) return 0;
  if (folder === 'inbox') return counts.unreadInbox ?? 0;
  if (folder === 'draft') return counts.counts?.draft ?? 0;
  return 0;
}

/** Folder counts live in the layout; lists call `refresh` after they change mail. */
export const MailCountsContext = createContext<{ counts: MailFolderCounts | null; refresh: () => void }>({
  counts: null,
  refresh: () => {},
});

export function useMailCounts() {
  return useContext(MailCountsContext);
}

// ── Context badges ───────────────────────────────────────────────────────────

/** Course context in blue (§10.1); system/announcement messages say so in words. */
export function ContextBadges({
  courseTitle, messageType, small,
}: { courseTitle?: string | null; messageType?: MailMessageType; small?: boolean }) {
  const cls = small ? m.chipSm : undefined;
  return (
    <>
      {courseTitle && <Chip tone="info" icon={<BookOutlined />} className={cls}>{courseTitle}</Chip>}
      {messageType === 'system' && <Chip tone="neutral" icon={<NotificationOutlined />} className={cls}>System</Chip>}
      {messageType === 'announcement' && <Chip tone="info" icon={<SoundOutlined />} className={cls}>Announcement</Chip>}
    </>
  );
}

// ── People and dates ─────────────────────────────────────────────────────────

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function PersonAvatar({ name, size = 'md' }: { name: string | null | undefined; size?: 'md' | 'lg' }) {
  return <span className={size === 'lg' ? `${m.avatar} ${m.avatarLg}` : m.avatar} aria-hidden>{initials(name)}</span>;
}

/** Time today, "Mon 12" this year, full date otherwise. */
export function formatMailDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatFullDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

'use client';

/**
 * One row in the /notifications list. Desktop: icon · content · actions in a
 * single row. ≤640px: becomes a card with actions on their own line
 * (see `.notif-item` rules in globals.css).
 */

import { Button, Tooltip } from 'antd';
import {
  AlertOutlined, ApiOutlined, AppstoreOutlined, BookOutlined, CheckOutlined,
  ExperimentOutlined, FormOutlined, InboxOutlined, MailOutlined, TrophyOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { Notification } from '@/types';
import {
  TONE_STYLE, fullTimestamp, isImportant, timeAgo,
  type NotificationBadge, type NotificationDisplay,
} from '@/lib/notificationDisplay';

const BADGE_ICON: Record<NotificationBadge, ReactNode> = {
  Simulation: <ExperimentOutlined />,
  Quiz:       <FormOutlined />,
  Course:     <BookOutlined />,
  Grade:      <TrophyOutlined />,
  Message:    <MailOutlined />,
  System:     <AlertOutlined />,
  Catalog:    <AppstoreOutlined />,
  LTI:        <ApiOutlined />,
};

interface Props {
  notification: Notification;
  display: NotificationDisplay;
  onOpen: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
}

export default function NotificationItem({ notification: n, display, onOpen, onMarkRead, onArchive }: Props) {
  const unread = n.status === 'unread';
  const archived = n.status === 'archived';
  const tone = archived ? { fg: '#6B7280', bg: '#F3F4F6' } : TONE_STYLE[display.tone];
  const important = isImportant(n) && !archived;
  const canOpen = typeof n.data?.actionUrl === 'string';

  const className = ['notif-item', unread && 'is-unread', archived && 'is-archived', canOpen && 'is-clickable']
    .filter(Boolean).join(' ');

  return (
    <div
      className={className}
      role={canOpen ? 'link' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? onOpen : undefined}
      onKeyDown={canOpen ? (e) => { if (e.key === 'Enter') onOpen(); } : undefined}
    >
      <span className="notif-item-icon" style={{ color: tone.fg, background: tone.bg }} aria-hidden>
        {BADGE_ICON[display.badge]}
      </span>

      <div className="notif-item-body">
        <div className="notif-item-title-row">
          <span className="notif-item-heading">
            {unread && <span className="notif-unread-dot" aria-label="Unread" />}
            <span className="notif-item-title" title={n.title}>{n.title}</span>
          </span>
          <span className="notif-chip" style={{ color: tone.fg, background: tone.bg }}>{display.badge}</span>
          {important && (
            <span
              className="notif-chip"
              style={n.priority === 'urgent'
                ? { color: TONE_STYLE.critical.fg, background: TONE_STYLE.critical.bg }
                : { color: TONE_STYLE.action.fg, background: TONE_STYLE.action.bg }}
            >
              {n.priority === 'urgent' ? 'Urgent' : 'Important'}
            </span>
          )}
        </div>

        {n.body && <p className="notif-item-message">{n.body}</p>}

        <div className="notif-item-meta">
          {display.context && (
            <span className="notif-context" title={display.context}>{display.context}</span>
          )}
          <span className="notif-type-label">{display.typeLabel}</span>
          <Tooltip title={fullTimestamp(n.createdAt)}>
            <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
          </Tooltip>
          {archived && <span>Archived</span>}
        </div>
      </div>

      {/* stopPropagation so buttons don't also trigger the row's open handler */}
      <div className="notif-item-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {display.actionLabel && (
          <Button size="small" onClick={onOpen}>{display.actionLabel}</Button>
        )}
        {unread && (
          <Tooltip title="Mark as read">
            <Button size="small" type="text" icon={<CheckOutlined />} onClick={onMarkRead} aria-label="Mark as read" />
          </Tooltip>
        )}
        {!archived && (
          <Button size="small" type="text" icon={<InboxOutlined />} onClick={onArchive} className="notif-archive-btn">
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}

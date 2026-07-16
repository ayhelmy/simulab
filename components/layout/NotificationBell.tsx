'use client';

/**
 * Notification bell with unread badge.
 * SRS §4.12 NOT-01: in-app notifications.
 * TODO: implement dropdown panel (skeleton only)
 */

import { useNotifications } from '@/context/NotificationContext';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <button aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ''}`}>
      🔔 {unreadCount > 0 && <span>{unreadCount}</span>}
    </button>
  );
}

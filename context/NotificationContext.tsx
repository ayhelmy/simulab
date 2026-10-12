'use client';

/**
 * Notification context — unread count + in-app notification feed.
 * SRS §4.12 NOT-01 to NOT-05. Polls the unread count (no WebSocket/SSE
 * infra in this stack) and refetches the recent list on demand (e.g. when
 * the bell dropdown opens).
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Notification } from '@/types';
import { useAuth } from './AuthContext';
import {
  listNotifications, getUnreadCount, markNotificationRead, markAllRead as apiMarkAllRead,
} from '@/lib/notifications';

const POLL_INTERVAL_MS = 45_000;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await listNotifications({ status: 'unread', limit: 10 });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Silently ignore — the bell just won't update this tick.
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const pollUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    pollUnreadCount();
    pollRef.current = setInterval(pollUnreadCount, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated, pollUnreadCount]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(id);
    } catch {
      // best-effort — next poll will reconcile
    }
  }, []);

  const markAllReadFn = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await apiMarkAllRead();
    } catch {
      // best-effort — next poll will reconcile
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead: markAllReadFn }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

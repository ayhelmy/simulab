'use client';

/**
 * Notification context — unread count + in-app notification feed.
 * SRS §4.12 NOT-01 to NOT-05.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setNotifications: (items: Notification[]) => void;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

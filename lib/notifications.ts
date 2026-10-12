/**
 * Notifications API helpers — Messaging & Notifications module.
 */

import { api } from './api';
import type { Notification, NotificationPreferences, NotificationStatus, NotificationPriority } from '@/types';
import type { PaginationMeta } from '@/types/api';

export interface NotificationQuery {
  status?:   NotificationStatus;
  type?:     string;
  priority?: NotificationPriority;
  page?:     number;
  limit?:    number;
}

export interface NotificationListResult {
  notifications: Notification[];
  unreadCount:   number;
  meta:          PaginationMeta;
}

export async function listNotifications(query?: NotificationQuery): Promise<NotificationListResult> {
  const res = await api.get<{ notifications: Notification[]; unreadCount: number; meta: PaginationMeta }>(
    '/notifications', query as Record<string, unknown>,
  );
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{ unreadCount: number }>('/notifications/unread-count');
  return res.data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.patch('/notifications/mark-all-read');
}

export async function archiveNotification(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/archive`);
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get<NotificationPreferences>('/notification-preferences');
  return res.data;
}

export async function updateNotificationPreferences(
  data: Partial<Pick<NotificationPreferences, 'emailEnabled' | 'inAppEnabled' | 'pushEnabled' | 'digestFrequency' | 'preferences'>>,
): Promise<NotificationPreferences> {
  const res = await api.patch<NotificationPreferences>('/notification-preferences', data);
  return res.data;
}

/**
 * Mail API helpers — asynchronous mailbox-style messaging (no live chat).
 */

import { api } from './api';
import type {
  MailFolder, MailListItem, MailMessageDetail, MailFolderCounts, MailAttachment, MessageableUser,
} from '@/types';
import type { PaginationMeta } from '@/types/api';

export interface MailQuery {
  search?:         string;
  unread_only?:    boolean;
  course_id?:      string;
  sender_id?:      string;
  date_from?:      string;
  date_to?:        string;
  has_attachments?: boolean;
  page?:           number;
  limit?:          number;
}

export interface ComposeData {
  to?:            string[];
  cc?:            string[];
  bcc?:           string[];
  subject?:       string;
  body:           string;
  courseId?:      string;
  attachments?:   MailAttachment[];
}

export type DraftData = Partial<ComposeData>;

const FOLDER_PATH: Record<MailFolder, string> = {
  inbox: 'inbox', sent: 'sent', draft: 'drafts', archived: 'archived', trash: 'trash',
};

export async function listFolder(folder: MailFolder, query?: MailQuery): Promise<{ messages: MailListItem[]; meta: PaginationMeta }> {
  const res = await api.get<{ messages: MailListItem[]; meta: PaginationMeta }>(
    `/mail/${FOLDER_PATH[folder]}`, query as Record<string, unknown>,
  );
  return res.data;
}

export async function getMessage(messageId: string): Promise<MailMessageDetail> {
  const res = await api.get<MailMessageDetail>(`/mail/messages/${messageId}`);
  return res.data;
}

export async function compose(data: ComposeData): Promise<MailMessageDetail> {
  const res = await api.post<MailMessageDetail>('/mail/messages', data);
  return res.data;
}

export async function saveDraft(data: DraftData): Promise<{ id: string }> {
  const res = await api.post<{ id: string }>('/mail/drafts', data);
  return res.data;
}

export async function updateDraft(draftId: string, data: DraftData): Promise<void> {
  await api.patch(`/mail/drafts/${draftId}`, data);
}

export async function deleteDraft(draftId: string): Promise<void> {
  await api.delete(`/mail/drafts/${draftId}`);
}

export async function sendDraft(draftId: string): Promise<MailMessageDetail> {
  const res = await api.post<MailMessageDetail>(`/mail/drafts/${draftId}/send`);
  return res.data;
}

export async function reply(messageId: string, body: string, attachments?: MailAttachment[]): Promise<MailMessageDetail> {
  const res = await api.post<MailMessageDetail>(`/mail/messages/${messageId}/reply`, { body, attachments });
  return res.data;
}

export async function replyAll(messageId: string, body: string, attachments?: MailAttachment[]): Promise<MailMessageDetail> {
  const res = await api.post<MailMessageDetail>(`/mail/messages/${messageId}/reply-all`, { body, attachments });
  return res.data;
}

export async function forward(messageId: string, data: ComposeData): Promise<MailMessageDetail> {
  const res = await api.post<MailMessageDetail>(`/mail/messages/${messageId}/forward`, data);
  return res.data;
}

export async function markRead(messageId: string): Promise<void> {
  await api.patch(`/mail/messages/${messageId}/read`);
}

export async function markUnread(messageId: string): Promise<void> {
  await api.patch(`/mail/messages/${messageId}/unread`);
}

export async function archiveMessage(messageId: string): Promise<void> {
  await api.patch(`/mail/messages/${messageId}/archive`);
}

export async function restoreMessage(messageId: string): Promise<void> {
  await api.patch(`/mail/messages/${messageId}/restore`);
}

export async function removeMessage(messageId: string): Promise<void> {
  await api.delete(`/mail/messages/${messageId}`);
}

export async function getUnreadCount(): Promise<number> {
  const res = await api.get<{ unreadCount: number }>('/mail/unread-count');
  return res.data.unreadCount;
}

export async function getFolderCounts(): Promise<MailFolderCounts> {
  const res = await api.get<MailFolderCounts>('/mail/folder-counts');
  return res.data;
}

export interface RecipientQuery {
  search?:         string;
  role?:           string;
  course_id?:      string;
  department_id?:  string;
  academic_year_id?: string;
  semester_term_id?: string;
  page?:           number;
  limit?:          number;
}

export async function listRecipients(query?: RecipientQuery): Promise<MessageableUser[]> {
  const res = await api.get<MessageableUser[]>('/mail/recipients', query as Record<string, unknown>);
  return res.data ?? [];
}

export async function uploadAttachment(file: File): Promise<MailAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.postForm<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }>('/mail/attachments', form);
  return { fileUrl: res.data.fileUrl, fileName: res.data.fileName, fileType: res.data.fileType, fileSize: res.data.fileSize };
}

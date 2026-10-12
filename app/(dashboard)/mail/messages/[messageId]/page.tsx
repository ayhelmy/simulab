'use client';

/**
 * Message detail: subject + context, sender / recipients / date, body,
 * attachments, then Reply as the primary action. Same mail calls as before;
 * after Archive / Delete the user returns to the folder the message was in.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { App, Button, Input, Popconfirm, Spin, Typography } from 'antd';
import {
  PaperClipOutlined, RollbackOutlined, ForwardOutlined, FolderOutlined, DeleteOutlined, MailOutlined,
  ArrowLeftOutlined, UndoOutlined, ArrowRightOutlined, SendOutlined,
} from '@ant-design/icons';
import {
  getMessage, reply as sendReply, replyAll as sendReplyAll, archiveMessage, removeMessage, markUnread, restoreMessage,
} from '@/lib/mail';
import type { MailMessageDetail, MailRecipientRef } from '@/types';
import { StateBlock, LoadErrorState } from '@/components/admin/adminUi';
import {
  mailStyles as m, ContextBadges, PersonAvatar, courseHref, folderMeta, formatFullDate, formatFileSize,
  useMailCounts, useMailRole,
} from '@/components/mail/mailUi';

type ReplyMode = null | 'reply' | 'reply-all';

const names = (list: MailRecipientRef[]) => list.map((r) => `${r.firstName} ${r.lastName}`).join(', ');

export default function MessageDetailPage() {
  const { messageId } = useParams<{ messageId: string }>();
  const router = useRouter();
  const { message: toast } = App.useApp();
  const role = useMailRole();
  const { refresh: refreshCounts } = useMailCounts();

  const [detail, setDetail] = useState<MailMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [replyMode, setReplyMode] = useState<ReplyMode>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getMessage(messageId));
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      refreshCounts();
    }
  }, [messageId, refreshCounts]);

  useEffect(() => { load(); }, [load]);

  const folder = folderMeta(detail?.folder ?? 'inbox');
  const backHref = folder.href;

  async function handleSendReply() {
    if (!replyBody.trim() || !replyMode) return;
    setSending(true);
    try {
      const fn = replyMode === 'reply-all' ? sendReplyAll : sendReply;
      await fn(messageId, replyBody.trim());
      toast.success('Reply sent.');
      setReplyBody('');
      setReplyMode(null);
      load();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      toast.error(e.title ?? e.detail ?? 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  }

  async function handleArchive() {
    try { await archiveMessage(messageId); toast.success('Archived.'); refreshCounts(); router.push(backHref); } catch { toast.error('Failed to archive.'); }
  }
  async function handleRestore() {
    try { await restoreMessage(messageId); toast.success('Restored.'); refreshCounts(); router.push(backHref); } catch { toast.error('Failed to restore.'); }
  }
  async function handleDelete() {
    try {
      await removeMessage(messageId);
      toast.success(detail?.folder === 'trash' ? 'Permanently deleted.' : 'Moved to Trash.');
      refreshCounts();
      router.push(backHref);
    } catch { toast.error('Failed to delete.'); }
  }
  async function handleMarkUnread() {
    try { await markUnread(messageId); toast.success('Marked unread.'); refreshCounts(); router.push(backHref); } catch { toast.error('Failed to mark unread.'); }
  }

  const backLink = (
    <button type="button" className={m.backLink} onClick={() => router.push(backHref)}>
      <ArrowLeftOutlined /> Back to {folder.label}
    </button>
  );

  if (loading && !detail) return <div className={m.loadingPane}><Spin size="large" /></div>;
  if (loadError && !detail) {
    return (
      <>
        {backLink}
        <LoadErrorState
          title="Could not load this message"
          text="The message could not be loaded. Check the connection and try again."
          onRetry={load}
        />
      </>
    );
  }
  if (!detail) {
    return (
      <>
        {backLink}
        <StateBlock title="Message not found" text="It may have been deleted or moved." />
      </>
    );
  }

  const senderName = detail.sender ? `${detail.sender.firstName} ${detail.sender.lastName}` : 'Unknown sender';
  const inTrash = detail.folder === 'trash';
  const canRestore = inTrash || detail.folder === 'archived';
  const canReplyAll = (detail.to.length + detail.cc.length) > 1;
  const earlier = detail.thread.filter((t) => t.id !== detail.id);

  return (
    <article aria-labelledby="message-subject">
      {backLink}

      <header className={m.detailHead}>
        <h2 className={m.detailTitle} id="message-subject">{detail.subject || '(no subject)'}</h2>
        {(detail.courseTitle || detail.messageType === 'system' || detail.messageType === 'announcement') && (
          <div className={m.detailChips}>
            <ContextBadges courseTitle={detail.courseTitle} messageType={detail.messageType} />
            {detail.courseId && detail.courseTitle && (
              <Link href={courseHref(role, detail.courseId)} className={m.courseLink}>
                Open Course <ArrowRightOutlined />
              </Link>
            )}
          </div>
        )}

        <div className={m.detailActions}>
          <Button type="primary" icon={<RollbackOutlined />} onClick={() => setReplyMode('reply')}>Reply</Button>
          {canReplyAll && <Button icon={<RollbackOutlined />} onClick={() => setReplyMode('reply-all')}>Reply all</Button>}
          <Button icon={<ForwardOutlined />} onClick={() => router.push(`/mail/compose?forwardId=${detail.id}`)}>Forward</Button>
          <span className={m.detailActionsEnd}>
            <Button icon={<MailOutlined />} onClick={handleMarkUnread}>Mark unread</Button>
            {canRestore ? (
              <Button icon={<UndoOutlined />} onClick={handleRestore}>Restore</Button>
            ) : (
              <Button icon={<FolderOutlined />} onClick={handleArchive}>Archive</Button>
            )}
            <Popconfirm
              title={inTrash ? 'Permanently delete this message?' : 'Move to Trash?'}
              okText={inTrash ? 'Delete permanently' : 'Move to Trash'}
              okButtonProps={{ danger: true }}
              onConfirm={handleDelete}
            >
              <Button type="text" danger icon={<DeleteOutlined />}>{inTrash ? 'Delete permanently' : 'Delete'}</Button>
            </Popconfirm>
          </span>
        </div>
      </header>

      <div className={m.senderBlock}>
        <PersonAvatar name={senderName} size="lg" />
        <div className={m.senderInfo}>
          <div className={m.senderTop}>
            <span className={m.senderName}>{senderName}</span>
            <time className={m.senderDate} dateTime={detail.sentAt ?? detail.createdAt}>
              {formatFullDate(detail.sentAt ?? detail.createdAt)}
            </time>
          </div>
          <p className={m.recipients}>
            <strong>To:</strong> {names(detail.to) || '—'}
            {detail.cc.length > 0 && <><br /><strong>Cc:</strong> {names(detail.cc)}</>}
            {detail.bcc && detail.bcc.length > 0 && <><br /><strong>Bcc:</strong> {names(detail.bcc)}</>}
          </p>
        </div>
      </div>

      <div className={m.messageBody}>{detail.body}</div>

      {detail.attachments.length > 0 && (
        <div className={m.attachments}>
          <span className={m.sectionLabel}>Attachments ({detail.attachments.length})</span>
          <div className={m.fileGrid}>
            {detail.attachments.map((a, i) => (
              <a key={i} href={a.fileUrl} target="_blank" rel="noreferrer" className={m.fileTile}>
                <PaperClipOutlined className={m.fileIcon} />
                <span className={m.fileName}>{a.fileName}</span>
                {a.fileSize ? <span className={m.fileSize}>{formatFileSize(a.fileSize)}</span> : null}
              </a>
            ))}
          </div>
        </div>
      )}

      {replyMode && (
        <div className={m.replyArea}>
          <label className={m.replyLabel} htmlFor="reply-body">
            {replyMode === 'reply-all' ? 'Reply to everyone' : `Reply to ${senderName}`}
          </label>
          <Input.TextArea
            id="reply-body"
            autoFocus
            rows={5}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={replyMode === 'reply-all' ? 'Reply to everyone…' : 'Write your reply…'}
          />
          <div className={m.replyActions}>
            <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSendReply} disabled={!replyBody.trim()}>
              Send Reply
            </Button>
            <Button onClick={() => { setReplyMode(null); setReplyBody(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {earlier.length > 0 && (
        <section className={m.thread} aria-label="Earlier in this conversation">
          <span className={m.sectionLabel}>Earlier in this conversation ({earlier.length})</span>
          {earlier.map((t) => (
            <div key={t.id} className={m.threadItem}>
              <PersonAvatar name={t.senderName} />
              <div className={m.threadBody}>
                <div className={m.senderTop}>
                  <span className={m.senderName}>{t.senderName}</span>
                  <time className={m.senderDate} dateTime={t.sentAt ?? t.createdAt}>{formatFullDate(t.sentAt ?? t.createdAt)}</time>
                </div>
                <Typography.Paragraph className={m.threadText} ellipsis={{ rows: 3, expandable: true }}>{t.body}</Typography.Paragraph>
              </div>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

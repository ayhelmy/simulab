'use client';

/**
 * One folder of the Messages workspace: toolbar (search, course, unread,
 * refresh), bulk action bar, message rows and the folder's empty / no-match /
 * error states. Rows collapse into stacked cards on small screens.
 * Loading and actions call the same mail endpoints as before.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  App, Input, Button, Checkbox, Popconfirm, Select, Pagination, Skeleton, Spin, Tooltip,
} from 'antd';
import {
  SearchOutlined, PaperClipOutlined, DeleteOutlined, FolderOutlined, UndoOutlined, ReloadOutlined,
  ArrowRightOutlined, EditOutlined, MailOutlined, CheckOutlined,
} from '@ant-design/icons';
import {
  listFolder, archiveMessage, removeMessage, restoreMessage, markRead, markUnread,
} from '@/lib/mail';
import { listCourses, listMyEnrolledCourses } from '@/lib/courses';
import type { Course, MailFolder, MailListItem } from '@/types';
import {
  Toolbar, ToolbarFilter, ResultCount, StateBlock, LoadErrorState,
} from '@/components/admin/adminUi';
import { Chip } from '@/components/student/studentUi';
import {
  mailStyles as m, MAIL_COPY, ContextBadges, PersonAvatar, folderMeta, formatMailDate, formatFullDate,
  useMailCounts, useMailRole,
} from './mailUi';

interface Props {
  folder: MailFolder;
}

const PAGE_SIZE = 20;

export default function MailList({ folder }: Props) {
  const router = useRouter();
  const { message: toast } = App.useApp();
  const role = useMailRole();
  const { refresh: refreshCounts } = useMailCounts();
  const meta = folderMeta(folder);

  const [items, setItems] = useState<MailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [checkedIds, setSelectedIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFolder(folder, {
        search: search || undefined,
        unread_only: unreadOnly || undefined,
        course_id: courseId || undefined,
        page, limit: PAGE_SIZE,
      });
      setItems(res.messages);
      setTotal(res.meta.total);
      setLoadError(false);
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [folder, search, unreadOnly, courseId, page]);

  useEffect(() => { setPage(1); setSelectedIds([]); }, [folder]);
  useEffect(() => { load(); }, [load]);
  // Only count selections that are still on screen after a reload.
  const selectedIds = useMemo(() => checkedIds.filter((id) => items.some((i) => i.id === id)), [checkedIds, items]);

  // Course filter options; the filter stays hidden if none are available.
  useEffect(() => {
    const request = role === 'student'
      ? listMyEnrolledCourses()
      : listCourses({ limit: 100 }).then((res) => res.courses);
    request.then(setCourses).catch(() => setCourses([]));
  }, [role]);

  const afterChange = useCallback(() => { load(); refreshCounts(); }, [load, refreshCounts]);

  const handleArchive = useCallback(async (id: string) => {
    try { await archiveMessage(id); toast.success('Archived.'); afterChange(); } catch { toast.error('Failed to archive.'); }
  }, [afterChange, toast]);
  const handleRestore = useCallback(async (id: string) => {
    try { await restoreMessage(id); toast.success('Restored.'); afterChange(); } catch { toast.error('Failed to restore.'); }
  }, [afterChange, toast]);
  const handleDelete = useCallback(async (id: string) => {
    try { await removeMessage(id); toast.success(folder === 'trash' ? 'Permanently deleted.' : 'Moved to Trash.'); afterChange(); } catch { toast.error('Failed to delete.'); }
  }, [afterChange, toast, folder]);

  async function runBulk(action: (id: string) => Promise<void>, failure: string, success?: string) {
    try {
      await Promise.all(selectedIds.map((id) => action(id)));
      if (success) toast.success(success);
      setSelectedIds([]);
      afterChange();
    } catch {
      toast.error(failure);
    }
  }

  const filtersActive = !!search || unreadOnly || !!courseId;
  function clearFilters() {
    setSearch('');
    setUnreadOnly(false);
    setCourseId(undefined);
    setPage(1);
  }

  const showRecipients = folder === 'sent' || folder === 'draft';
  const canRestore = folder === 'trash' || folder === 'archived';
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const courseOptions = useMemo(() => courses.map((c) => ({ value: c.id, label: c.title })), [courses]);

  const toolbar = (
    <Toolbar
      search={
        <Input
          placeholder={MAIL_COPY[role].search}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          prefix={<SearchOutlined style={{ color: 'var(--sl-text-muted)' }} />}
          allowClear
          aria-label="Search messages"
        />
      }
      filters={
        <>
          {courseOptions.length > 0 && (
            <ToolbarFilter>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="All courses"
                value={courseId}
                onChange={(v) => { setCourseId(v); setPage(1); }}
                options={courseOptions}
                style={{ width: '100%' }}
                aria-label="Filter by course"
              />
            </ToolbarFilter>
          )}
          {folder === 'inbox' && (
            <Checkbox checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}>
              Unread only
            </Checkbox>
          )}
        </>
      }
      end={
        <Tooltip title="Refresh">
          <Button icon={<ReloadOutlined />} onClick={() => { load(); refreshCounts(); }} aria-label="Refresh messages" />
        </Tooltip>
      }
    />
  );

  function renderBody() {
    if (loadError) {
      return (
        <LoadErrorState
          title="Could not load messages"
          text="Messages could not be loaded. Check the connection and try again."
          onRetry={load}
        />
      );
    }
    if (loading && items.length === 0) {
      return (
        <div aria-busy="true" aria-label="Loading messages">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={m.skeletonRow}>
              <Skeleton active avatar={{ size: 36 }} title={{ width: '30%' }} paragraph={{ rows: 1, width: '70%' }} />
            </div>
          ))}
        </div>
      );
    }
    if (items.length === 0) {
      return filtersActive ? (
        <StateBlock
          kind="no-match"
          title="No messages found"
          text="Try a different search term or clear filters."
          actions={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <StateBlock icon={meta.icon} title={meta.emptyTitle} text={meta.emptyText} />
      );
    }

    return (
      <Spin spinning={loading}>
        <ul className={m.list} aria-label={`${meta.label} messages`}>
          {items.map((item) => (
            <MessageRow
              key={item.id}
              item={item}
              folder={folder}
              showRecipients={showRecipients}
              canRestore={canRestore}
              selected={selectedIds.includes(item.id)}
              onSelect={(checked) => setSelectedIds((ids) => (checked ? [...ids, item.id] : ids.filter((id) => id !== item.id)))}
              onOpen={(href) => router.push(href)}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))}
        </ul>
        {total > PAGE_SIZE && (
          <div className={m.pager}>
            <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} size="small" />
          </div>
        )}
      </Spin>
    );
  }

  return (
    <div>
      {toolbar}

      {selectedIds.length > 0 ? (
        <div className={m.bulkBar} role="region" aria-label="Bulk actions">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected}
            onChange={(e) => setSelectedIds(e.target.checked ? items.map((i) => i.id) : [])}
            aria-label="Select all messages on this page"
          />
          <span className={m.bulkCount}>{selectedIds.length} selected</span>
          {folder === 'inbox' && (
            <>
              <Button size="small" icon={<CheckOutlined />} onClick={() => runBulk(markRead, 'Failed to mark as read.')}>Mark as read</Button>
              <Button size="small" icon={<MailOutlined />} onClick={() => runBulk(markUnread, 'Failed to mark as unread.')}>Mark as unread</Button>
            </>
          )}
          {canRestore ? (
            <Button size="small" icon={<UndoOutlined />} onClick={() => runBulk(restoreMessage, 'Failed to restore.', 'Restored.')}>Restore</Button>
          ) : (
            <Button size="small" icon={<FolderOutlined />} onClick={() => runBulk(archiveMessage, 'Failed to archive.', 'Archived.')}>Archive</Button>
          )}
          <Popconfirm
            title={folder === 'trash' ? `Permanently delete ${selectedIds.length} message(s)?` : `Move ${selectedIds.length} message(s) to Trash?`}
            okText={folder === 'trash' ? 'Delete permanently' : 'Move to Trash'}
            okButtonProps={{ danger: true }}
            onConfirm={() => runBulk(removeMessage, 'Failed to delete.', folder === 'trash' ? 'Permanently deleted.' : 'Moved to Trash.')}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>{folder === 'trash' ? 'Delete permanently' : 'Delete'}</Button>
          </Popconfirm>
          <span className={m.bulkEnd}>
            <Button size="small" type="text" onClick={() => setSelectedIds([])}>Clear selection</Button>
          </span>
        </div>
      ) : (
        !loadError && items.length > 0 && (
          <div className={m.listHead}>
            <Checkbox
              checked={false}
              onChange={(e) => setSelectedIds(e.target.checked ? items.map((i) => i.id) : [])}
              aria-label="Select all messages on this page"
            />
            <span>{meta.label}</span>
            <span className={m.listHeadEnd}>
              <ResultCount shown={items.length} total={total} noun="message" />
            </span>
          </div>
        )
      )}

      {renderBody()}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function MessageRow({
  item, folder, showRecipients, canRestore, selected, onSelect, onOpen, onArchive, onRestore, onDelete,
}: {
  item: MailListItem;
  folder: MailFolder;
  showRecipients: boolean;
  canRestore: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onOpen: (href: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const unread = !item.isRead && folder === 'inbox';
  const isDraft = folder === 'draft';
  const href = isDraft ? `/mail/compose?draftId=${item.id}` : `/mail/messages/${item.id}`;
  const party = showRecipients ? (item.recipients?.join(', ') || '') : item.senderName;
  const when = item.sentAt ?? item.createdAt;
  const hasChips = !!item.courseTitle || item.messageType === 'system' || item.messageType === 'announcement' || item.recipientType === 'cc';
  const stop = (e: SyntheticEvent) => e.stopPropagation();

  return (
    <li
      className={[m.row, unread ? m.rowUnread : '', selected ? m.rowSelected : ''].filter(Boolean).join(' ')}
      onClick={() => onOpen(href)}
    >
      <span onClick={stop}>
        <Checkbox checked={selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`Select "${item.subject}"`} />
      </span>
      <span className={m.dot} aria-hidden />
      <PersonAvatar name={showRecipients ? item.recipients?.[0] : item.senderName} />

      <div className={m.rowBody}>
        <span className={m.party}>
          {showRecipients && <span className={m.partyPrefix}>To: </span>}
          {party || (isDraft ? 'No recipients yet' : 'Unknown')}
        </span>
        <span className={m.subjectLine}>
          <Link href={href} className={m.subject} onClick={stop}>
            {unread && <span style={srOnly}>Unread: </span>}
            {item.subject || '(no subject)'}
          </Link>
          {item.bodyPreview && <span className={m.preview}> — {item.bodyPreview}</span>}
        </span>
        {hasChips && (
          <span className={m.rowChips}>
            <ContextBadges courseTitle={item.courseTitle} messageType={item.messageType} small />
            {item.recipientType === 'cc' && <Chip tone="neutral" className={m.chipSm}>Cc</Chip>}
          </span>
        )}
      </div>

      <div className={m.rowSide}>
        <span className={m.rowMeta}>
          {item.hasAttachments && (
            <span className={m.attach} title={`${item.attachmentCount || 1} attachment(s)`}>
              <PaperClipOutlined aria-label="Has attachments" />
              {item.attachmentCount > 1 && item.attachmentCount}
            </span>
          )}
          <time dateTime={when} title={formatFullDate(when)}>{formatMailDate(when)}</time>
        </span>
        <span className={m.rowActions} onClick={stop}>
          {canRestore ? (
            <Tooltip title="Restore">
              <Button type="text" size="small" icon={<UndoOutlined />} onClick={() => onRestore(item.id)} aria-label="Restore" />
            </Tooltip>
          ) : (
            <Tooltip title="Archive">
              <Button type="text" size="small" icon={<FolderOutlined />} onClick={() => onArchive(item.id)} aria-label="Archive" />
            </Tooltip>
          )}
          <Popconfirm
            title={folder === 'trash' ? 'Permanently delete this message?' : 'Move to Trash?'}
            okText={folder === 'trash' ? 'Delete permanently' : 'Move to Trash'}
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(item.id)}
          >
            <Tooltip title={folder === 'trash' ? 'Delete permanently' : 'Delete'}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Delete" />
            </Tooltip>
          </Popconfirm>
          <Tooltip title={isDraft ? 'Edit draft' : 'Open'}>
            <Button
              type="text" size="small"
              icon={isDraft ? <EditOutlined /> : <ArrowRightOutlined />}
              onClick={() => onOpen(href)}
              aria-label={isDraft ? 'Edit draft' : 'Open message'}
            />
          </Tooltip>
        </span>
      </div>
    </li>
  );
}

const srOnly: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0,
};

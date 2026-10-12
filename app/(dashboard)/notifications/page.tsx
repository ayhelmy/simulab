'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Card, Pagination, Segmented, Select, Skeleton } from 'antd';
import { BellOutlined, CheckOutlined, InboxOutlined, SearchOutlined, SmileOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useAuth } from '@/context/AuthContext';
import {
  listNotifications, markNotificationRead, markAllRead, archiveNotification,
} from '@/lib/notifications';
import {
  audienceFor, describeNotification, groupByDate, typeFilterOptions,
} from '@/lib/notificationDisplay';
import type { Notification, NotificationPriority, NotificationStatus } from '@/types';

const PAGE_SIZE = 20;

type FilterKey = 'all' | NotificationStatus;

interface Counts { unread: number | null; important: number | null; archived: number | null }

const EMPTY_ICON = { fontSize: 44, color: '#C7CACD' };

export default function NotificationsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const audience = audienceFor(user);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | undefined>(undefined);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts>({ unread: null, important: null, archived: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [countsKey, setCountsKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listNotifications({
      status: filter === 'all' ? undefined : filter,
      type: typeFilter,
      priority: priorityFilter,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setNotifications(res.notifications);
        setTotal(res.meta.total);
        setCounts((c) => ({ ...c, unread: res.unreadCount }));
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, typeFilter, priorityFilter, page, reloadKey]);

  /** Summary counts — read-only `limit: 1` queries on the existing list endpoint; failures just hide the chip. */
  useEffect(() => {
    let cancelled = false;
    const totalFor = (q: Parameters<typeof listNotifications>[0]) =>
      listNotifications({ ...q, limit: 1 }).then((r) => r.meta.total).catch(() => null);
    Promise.all([
      totalFor({ status: 'archived' }),
      totalFor({ status: 'unread', priority: 'urgent' }),
      totalFor({ status: 'unread', priority: 'high' }),
    ]).then(([archived, urgent, high]) => {
      if (cancelled) return;
      setCounts((c) => ({
        ...c,
        archived,
        important: urgent === null || high === null ? null : urgent + high,
      }));
    });
    return () => { cancelled = true; };
  }, [countsKey]);

  /** Every change to what the list shows goes through here so the loading state is set before the fetch. */
  const updateView = useCallback((apply: () => void) => {
    setLoading(true);
    setError(false);
    apply();
  }, []);
  const load = useCallback(() => updateView(() => setReloadKey((k) => k + 1)), [updateView]);
  const loadCounts = useCallback(() => setCountsKey((k) => k + 1), []);

  const typeOptions = useMemo(
    () => typeFilterOptions(audience, notifications.map((n) => n.type)),
    [audience, notifications],
  );
  const groups = useMemo(() => groupByDate(notifications), [notifications]);
  const hasFilters = Boolean(typeFilter || priorityFilter);

  /** Applies a tab/filter/page change; a no-op change skips the loading state (the effect wouldn't re-run). */
  function changeView(next: { filter?: FilterKey; type?: string; priority?: NotificationPriority; page: number }) {
    const nextFilter = 'filter' in next ? next.filter! : filter;
    const nextType = 'type' in next ? next.type : typeFilter;
    const nextPriority = 'priority' in next ? next.priority : priorityFilter;
    if (nextFilter === filter && nextType === typeFilter && nextPriority === priorityFilter && next.page === page) return;
    updateView(() => {
      setFilter(nextFilter);
      setTypeFilter(nextType);
      setPriorityFilter(nextPriority);
      setPage(next.page);
    });
  }

  function clearFilters() {
    changeView({ type: undefined, priority: undefined, page: 1 });
  }

  async function handleMarkRead(n: Notification) {
    try {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: 'read', isRead: true } : x)));
      setCounts((c) => ({ ...c, unread: c.unread === null ? null : Math.max(0, c.unread - 1) }));
      if (n.priority === 'high' || n.priority === 'urgent') loadCounts();
    } catch {
      message.error('Failed to mark as read.');
    }
  }

  async function handleArchive(n: Notification) {
    try {
      await archiveNotification(n.id);
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      setTotal((t) => Math.max(0, t - 1));
      if (n.status === 'unread') {
        setCounts((c) => ({ ...c, unread: c.unread === null ? null : Math.max(0, c.unread - 1) }));
      }
      loadCounts();
    } catch {
      message.error('Failed to archive notification.');
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead();
      message.success('All notifications marked as read.');
      load();
      loadCounts();
    } catch {
      message.error('Failed to mark all as read.');
    }
  }

  function handleOpen(n: Notification) {
    if (n.status === 'unread') handleMarkRead(n);
    const actionUrl = n.data?.actionUrl;
    if (typeof actionUrl === 'string') router.push(actionUrl);
  }

  const tabLabel = (label: string, count: number | null, secondary = false) => (
    <span className="notif-tab-label">
      {label}
      {count !== null && count > 0 && (
        <span className={`notif-tab-count${secondary ? ' is-secondary' : ''}`}>{count > 99 ? '99+' : count}</span>
      )}
    </span>
  );

  function renderEmpty() {
    if (hasFilters) {
      return (
        <EmptyState
          image={<SearchOutlined style={EMPTY_ICON} />}
          title="No notifications found"
          description="Try changing your filters."
          extra={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      );
    }
    if (filter === 'unread') {
      return (
        <EmptyState
          image={<SmileOutlined style={EMPTY_ICON} />}
          title="You’re all caught up"
          description="There are no unread notifications right now."
        />
      );
    }
    if (filter === 'archived') {
      return (
        <EmptyState
          image={<InboxOutlined style={EMPTY_ICON} />}
          title="No archived notifications"
          description="Archived notifications will appear here."
        />
      );
    }
    if (filter === 'read') {
      return (
        <EmptyState
          image={<InboxOutlined style={EMPTY_ICON} />}
          title="No read notifications"
          description="Notifications you have opened or marked as read will appear here."
        />
      );
    }
    return (
      <EmptyState
        image={<BellOutlined style={EMPTY_ICON} />}
        title="No notifications yet"
        description="Updates and alerts will appear here when there is something to review."
      />
    );
  }

  const unreadCount = counts.unread ?? 0;

  return (
    <div className="notif-page">
      <PageHeader
        title="Notifications"
        subtitle="Everything that needs your attention, in one place."
        extra={(
          <Button icon={<CheckOutlined />} onClick={handleMarkAllRead} disabled={counts.unread === 0}>
            Mark all read
          </Button>
        )}
      />

      {counts.unread !== null && (
        <div className="notif-summary" aria-label="Notification summary">
          <span className={`notif-summary-item${unreadCount > 0 ? ' is-accent' : ''}`}>
            <strong>{unreadCount}</strong> unread
          </span>
          {counts.important !== null && (
            <span className="notif-summary-item"><strong>{counts.important}</strong> important</span>
          )}
          {counts.archived !== null && (
            <span className="notif-summary-item"><strong>{counts.archived}</strong> archived</span>
          )}
        </div>
      )}

      <Card className="notif-card" styles={{ body: { padding: 0 } }}>
        <div className="notif-toolbar">
          <Segmented
            className="notif-tabs"
            value={filter}
            onChange={(v) => changeView({ filter: v as FilterKey, page: 1 })}
            options={[
              { label: tabLabel('All', null), value: 'all' },
              { label: tabLabel('Unread', counts.unread), value: 'unread' },
              { label: tabLabel('Read', null), value: 'read' },
              { label: tabLabel('Archived', counts.archived, true), value: 'archived' },
            ]}
          />
          <div className="notif-filters">
            <Select
              allowClear
              placeholder="All types"
              aria-label="Filter by type"
              popupMatchSelectWidth={false}
              value={typeFilter}
              onChange={(v) => changeView({ type: v, page: 1 })}
              options={typeOptions}
            />
            <Select
              allowClear
              placeholder="Any priority"
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(v) => changeView({ priority: v, page: 1 })}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'Important' },
                { value: 'normal', label: 'Normal' },
                { value: 'low', label: 'Low' },
              ]}
            />
            {hasFilters && <Button type="link" size="small" onClick={clearFilters}>Clear filters</Button>}
          </div>
        </div>

        <div className="notif-list-wrap">
          {error ? (
            <DashboardErrorState
              title="Could not load notifications"
              message="Notifications could not be loaded. Check the connection and try again."
              onRetry={load}
              extra={<Button size="small" onClick={() => window.location.reload()}>Refresh</Button>}
            />
          ) : loading ? (
            <div className="notif-skeleton">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} active avatar={{ shape: 'circle', size: 36 }} paragraph={{ rows: 1 }} title={{ width: '40%' }} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            renderEmpty()
          ) : (
            <>
              {groups.map((g) => (
                <section key={g.label} className="notif-group" aria-label={g.label}>
                  <h3 className="notif-group-label">{g.label}</h3>
                  <div className="notif-group-items">
                    {g.items.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        display={describeNotification(n, audience)}
                        onOpen={() => handleOpen(n)}
                        onMarkRead={() => handleMarkRead(n)}
                        onArchive={() => handleArchive(n)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {total > PAGE_SIZE && (
                <div className="notif-pagination">
                  <Pagination
                    size="small"
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onChange={(p) => changeView({ page: p })}
                    showSizeChanger={false}
                    showTotal={(t) => `${t} notifications`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

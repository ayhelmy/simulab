'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PaginationMeta } from '@/types/api';
import { Table, Input, Pagination, Button, Tooltip, type TableColumnsType } from 'antd';
import { AuditOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  ADMIN_PAGE_CLASS, adminStyles as a, AdminHeader, AdminCard, Toolbar, ResultCount,
  StateBlock, LoadErrorState, formatWhen, statusLabel,
} from '@/components/admin/adminUi';

const { Search } = Input;

interface AuditEntry {
  id: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  institutionId?: string;
}


export default function AuditLogsPage() {
  const allowed = useRouteGuard('platform.audit.view', 'audit.view_institution');
  const { hasPermission } = useAuth();

  const [logs,    setLogs]    = useState<AuditEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  const canViewAll = hasPermission('platform.audit.view');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) qs.set('search', search);
      const endpoint = canViewAll ? `/audit-logs` : `/audit-logs/institution`;
      const res = await api.get<AuditEntry[]>(endpoint, { page, limit: 25, ...(search ? { search } : {}) });
      setLogs(res.data ?? []);
      setTotal((res.meta as PaginationMeta | undefined)?.total ?? res.data?.length ?? 0);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, search, canViewAll]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  if (!allowed) return null;

  const columns: TableColumnsType<AuditEntry> = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 160,
      render: (ts: string) => (
        <span style={{ whiteSpace: 'nowrap' }} title={new Date(ts).toLocaleString()}>{formatWhen(ts)}</span>
      ),
    },
    {
      title: 'Actor',
      dataIndex: 'actorEmail',
      render: (email: string | undefined) => email ?? <span className={a.muted}>System</span>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (action: string) => <span className={a.mono}>{action}</span>,
    },
    {
      title: 'Affected item',
      key: 'entity',
      render: (_: unknown, row: AuditEntry) => row.entityType ? (
        <Tooltip title={row.entityId}>
          <span className={a.cellSub} style={{ fontSize: 13 }}>{statusLabel(row.entityType)}</span>
        </Tooltip>
      ) : <span className={a.muted}>—</span>,
    },
  ];

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        title="Audit Logs"
        subtitle={canViewAll
          ? 'Review changes made across the platform: who did what, and when.'
          : 'Review changes made in your institution: who did what, and when.'}
      />

      <AdminCard
        flush
        toolbar={
          <Toolbar
            search={
              <Search
                placeholder="Search by action or actor"
                aria-label="Search audit logs by action or actor"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                allowClear
              />
            }
            end={
              <>
                {!error && !loading && <ResultCount total={total} noun="entry" plural="entries" />}
                <Tooltip title="Refresh">
                  <Button icon={<ReloadOutlined />} aria-label="Refresh audit logs" onClick={load} />
                </Tooltip>
              </>
            }
          />
        }
      >
        {error ? (
          <LoadErrorState
            title="Could not load audit logs"
            text="Audit log entries could not be loaded. Check the connection or try again."
            detail={error}
            onRetry={load}
          />
        ) : (
          <>
            <Table
              dataSource={logs}
              columns={columns}
              rowKey="id"
              size="middle"
              loading={loading}
              scroll={{ x: 720 }}
              // The page pages through the API (25 per page) below.
              pagination={false}
              locale={{
                emptyText: loading ? ' ' : search ? (
                  <StateBlock kind="no-match" title="No entries match your search" text="Try a different action name or actor email."
                    actions={<Button onClick={() => { setSearch(''); setPage(1); }}>Clear search</Button>} />
                ) : (
                  <StateBlock icon={<AuditOutlined />} title="No records found" text="Records will appear here once they are created or synced." />
                ),
              }}
            />
            {total > 25 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
                </span>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={25}
                  onChange={setPage}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            )}
          </>
        )}
      </AdminCard>
    </div>
  );
}

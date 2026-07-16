'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PaginationMeta } from '@/types/api';
import PageHeader from '@/components/common/PageHeader';
import {
  Table, Tag, Input, Pagination, Spin, Alert, Typography, Row, Col,
  type TableColumnsType,
} from 'antd';
import { AuditOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Text }   = Typography;

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
      title: 'Timestamp',
      dataIndex: 'createdAt',
      width: 180,
      render: (ts: string) => (
        <Text style={{ fontSize: 12 }}>{new Date(ts).toLocaleString()}</Text>
      ),
    },
    {
      title: 'Actor',
      dataIndex: 'actorEmail',
      render: (email: string) => <Text>{email ?? '—'}</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (action: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 11 }}>{action}</Tag>
      ),
    },
    {
      title: 'Entity',
      key: 'entity',
      render: (_: unknown, row: AuditEntry) => row.entityType ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.entityType} · {row.entityId?.slice(0, 8)}…
        </Text>
      ) : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle={total ? `${total.toLocaleString()} entries` : undefined}
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col flex="1 1 300px">
          <Search
            placeholder="Search by action or actor…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
          />
        </Col>
      </Row>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : logs.length === 0 ? (
        <Alert
          type="info"
          showIcon
          icon={<AuditOutlined />}
          title="No audit log entries found."
        />
      ) : (
        <>
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            size="small"
           
          />
          {total > 25 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
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
    </div>
  );
}

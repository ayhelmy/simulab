'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import PermissionGuard from '@/components/layout/PermissionGuard';
import UserTable from '@/components/users/UserTable';
import UserModal from '@/components/users/UserModal';
import BulkImportModal from '@/components/users/BulkImportModal';
import RoleAssignModal from '@/components/users/RoleAssignModal';
import { listUsers, updateUser, deleteUser } from '@/lib/users';
import type { User } from '@/types';
import type { PaginationMeta } from '@/types/api';
import {
  Input, Select, Button, Alert, Pagination, Row, Col, Typography, App,
} from 'antd';
import { PlusOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Search } = Input;
const { Text } = Typography;

const ROLE_OPTIONS = [
  'super_admin', 'institution_admin', 'dept_manager',
  'instructor', 'teaching_assistant', 'student', 'guest',
].map((r) => ({ value: r, label: r.replace(/_/g, ' ') }));

export default function UsersPage() {
  const allowed = useRouteGuard('users.view_institution', 'users.view_all', 'users.view_department');
  const { message } = App.useApp();

  const [users, setUsers]     = useState<User[]>([]);
  const [meta, setMeta]       = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [status, setStatus]           = useState<string | undefined>();
  const [role, setRole]               = useState<string | undefined>();
  const [page, setPage]               = useState(1);

  const [userModal,   setUserModal]   = useState<{ open: boolean; user?: User }>({ open: false });
  const [importModal, setImportModal] = useState(false);
  const [roleModal,   setRoleModal]   = useState<{ open: boolean; user?: User }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        page, limit: 20,
        search:  search  || undefined,
        status:  (status as User['status']) || undefined,
        role:    role    || undefined,
      });
      setUsers(result.users);
      setMeta(result.meta);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, role]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleSuspend(user: User) {
    try {
      const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
      await updateUser(user.id, { status: newStatus });
      message.success(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'}.`);
      load();
    } catch {
      message.error('Failed to update user status.');
    }
  }

  async function handleDelete(user: User) {
    try {
      await deleteUser(user.id);
      message.success('User deleted.');
      load();
    } catch {
      message.error('Failed to delete user.');
    }
  }

  if (!allowed) return null;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={meta ? `${meta.total} user${meta.total !== 1 ? 's' : ''} total` : undefined}
        extra={
          <PermissionGuard permission="users.create">
            <Button icon={<UploadOutlined />} onClick={() => setImportModal(true)}>Bulk Import</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModal({ open: true })}>
              Add User
            </Button>
          </PermissionGuard>
        }
      />

      {/* Filters */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col flex="1 1 240px">
          <Search
            placeholder="Search by name or email…"
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            allowClear
          />
        </Col>
        <Col flex="0 0 160px">
          <Select
            placeholder="All Statuses"
            value={status}
            onChange={(v: string | undefined) => { setStatus(v); setPage(1); }}
            allowClear
            style={{ width: '100%' }}
            options={[
              { value: 'active',    label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'pending',   label: 'Pending' },
            ]}
          />
        </Col>
        <Col flex="0 0 200px">
          <Select
            placeholder="All Roles"
            value={role}
            onChange={(v: string | undefined) => { setRole(v); setPage(1); }}
            allowClear
            style={{ width: '100%' }}
            options={ROLE_OPTIONS}
          />
        </Col>
      </Row>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      <UserTable
        users={users}
        loading={loading}
        onEdit={(user) => setUserModal({ open: true, user })}
        onAssignRole={(user) => setRoleModal({ open: true, user })}
        onSuspend={handleSuspend}
        onDelete={handleDelete}
        onEditAcademic={(user) => setUserModal({ open: true, user })}
      />

      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {((page - 1) * meta.limit) + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total}
          </Text>
          <Pagination
            current={page}
            total={meta.total}
            pageSize={meta.limit}
            onChange={setPage}
            showSizeChanger={false}
            size="small"
          />
        </div>
      )}

      {/* Modals */}
      {userModal.open && (
        <UserModal
          user={userModal.user}
          onClose={() => setUserModal({ open: false })}
          onSuccess={() => { setUserModal({ open: false }); load(); }}
        />
      )}

      {importModal && (
        <BulkImportModal
          onClose={() => setImportModal(false)}
          onSuccess={() => { setImportModal(false); load(); }}
        />
      )}

      {roleModal.open && roleModal.user && (
        <RoleAssignModal
          user={roleModal.user}
          onClose={() => setRoleModal({ open: false })}
          onSuccess={() => { setRoleModal({ open: false }); load(); }}
        />
      )}
    </div>
  );
}

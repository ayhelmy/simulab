'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import { useAuth } from '@/context/AuthContext';
import PermissionGuard from '@/components/layout/PermissionGuard';
import UserTable from '@/components/users/UserTable';
import UserModal from '@/components/users/UserModal';
import BulkImportModal from '@/components/users/BulkImportModal';
import RoleAssignModal from '@/components/users/RoleAssignModal';
import { listUsers, updateUser, deleteUser } from '@/lib/users';
import type { User } from '@/types';
import type { PaginationMeta } from '@/types/api';
import { Input, Select, Button, Pagination, Tooltip, App } from 'antd';
import { PlusOutlined, UploadOutlined, SearchOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import {
  ADMIN_PAGE_CLASS, AdminHeader, AdminCard, Toolbar, ToolbarFilter, ResultCount,
  StateBlock, LoadErrorState,
} from '@/components/admin/adminUi';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', institution_admin: 'Institution Admin', dept_manager: 'Department Manager',
  instructor: 'Instructor', teaching_assistant: 'Teaching Assistant', student: 'Student', guest: 'Guest',
};

const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));

export default function UsersPage() {
  const allowed = useRouteGuard('users.view_institution', 'users.view_all', 'users.view_department');
  const { message } = App.useApp();
  const { hasPermission } = useAuth();
  // Super Admin sees every institution; institution and department admins see their own.
  const platformScope = hasPermission('users.view_all');

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

  const hasFilters = !!(search || status || role);
  // Platform-only roles are not offered to institution-scoped admins.
  const roleOptions = platformScope ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value !== 'super_admin' && o.value !== 'guest');
  function clearFilters() {
    setSearchInput(''); setSearch(''); setStatus(undefined); setRole(undefined); setPage(1);
  }

  return (
    <div className={ADMIN_PAGE_CLASS}>
      <AdminHeader
        title={platformScope ? 'User Management' : 'Institution Users'}
        subtitle={platformScope
          ? 'Manage platform users, roles, access, and institution assignments.'
          : 'Manage your institution’s users, their roles, and their academic assignments.'}
        actions={
          <PermissionGuard permission="users.create">
            <Button icon={<UploadOutlined />} onClick={() => setImportModal(true)}>Bulk Import</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModal({ open: true })}>
              Add User
            </Button>
          </PermissionGuard>
        }
      />

      <AdminCard
        flush
        toolbar={
          <Toolbar
            search={
              <Input
                placeholder="Search by name or email"
                aria-label="Search users by name or email"
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
                allowClear
              />
            }
            filters={
              <>
                <ToolbarFilter>
                  <Select
                    placeholder="All statuses"
                    aria-label="Filter by status"
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
                </ToolbarFilter>
                <ToolbarFilter>
                  <Select
                    placeholder="All roles"
                    aria-label="Filter by role"
                    value={role}
                    onChange={(v: string | undefined) => { setRole(v); setPage(1); }}
                    allowClear
                    style={{ width: '100%' }}
                    options={roleOptions}
                  />
                </ToolbarFilter>
                {hasFilters && <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>Clear filters</Button>}
              </>
            }
            end={
              <>
                {!error && <ResultCount total={meta?.total} noun="user" />}
                <Tooltip title="Refresh">
                  <Button icon={<ReloadOutlined />} aria-label="Refresh users" onClick={load} loading={loading && !!users.length} />
                </Tooltip>
              </>
            }
          />
        }
      >
        {error ? (
          <LoadErrorState
            title="Could not load users"
            text="The user list could not be loaded. Check the connection or try again."
            detail={error}
            onRetry={load}
          />
        ) : (
          <UserTable
            users={users}
            loading={loading}
            onEdit={(user) => setUserModal({ open: true, user })}
            onAssignRole={(user) => setRoleModal({ open: true, user })}
            onSuspend={handleSuspend}
            onDelete={handleDelete}
            onEditAcademic={(user) => setUserModal({ open: true, user })}
            emptyState={hasFilters ? (
              <StateBlock
                kind="no-match"
                title="No users match your filters"
                text="Try a different name or email, or clear the status and role filters."
                actions={<Button onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <StateBlock
                icon={<TeamOutlined />}
                title="No users found"
                text={platformScope
                  ? 'Users will appear here once they are added or synced from an institution.'
                  : 'Users will appear here once they are added to your institution or imported in bulk.'}
              />
            )}
          />
        )}

        {!error && meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>
              Showing {((page - 1) * meta.limit) + 1}–{Math.min(page * meta.limit, meta.total)} of {meta.total.toLocaleString()}
            </span>
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
      </AdminCard>

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

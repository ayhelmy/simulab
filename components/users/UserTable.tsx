'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types';
import { Table, Avatar, Button, Tooltip, Popconfirm, type TableColumnsType } from 'antd';
import {
  EditOutlined, SafetyCertificateOutlined,
  StopOutlined, CheckCircleOutlined, DeleteOutlined, BookOutlined,
} from '@ant-design/icons';
import { Chip } from '@/components/student/studentUi';
import { adminStyles as a, StatusChip, formatWhen } from '@/components/admin/adminUi';

interface Props {
  users: User[];
  loading: boolean;
  onEdit:            (user: User) => void;
  onAssignRole:      (user: User) => void;
  onSuspend:         (user: User) => void;
  onDelete:          (user: User) => void;
  onEditAcademic?:   (user: User) => void;
  /** Rendered instead of antd's "No data" when the list is empty. */
  emptyState?: ReactNode;
}

const initials = (u: User) => `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();

/** Roles as chips, capped at three plus "+n" (§21.4). */
function RoleChips({ user }: { user: User }) {
  if (!user.roles.length) return <span className={a.muted}>—</span>;
  const shown = user.roles.slice(0, 3);
  const rest = user.roles.length - shown.length;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {shown.map((r) => <Chip key={r.id} tone="info">{r.label}</Chip>)}
      {rest > 0 && <Tooltip title={user.roles.slice(3).map((r) => r.label).join(', ')}><Chip tone="neutral">+{rest}</Chip></Tooltip>}
    </span>
  );
}

function AcademicCell({ user }: { user: User }) {
  if (user.roles.some((r) => r.name === 'super_admin')) {
    return <span className={a.cellSub}>Platform-wide</span>;
  }
  if (!user.roles.some((r) => r.name === 'student')) return <span className={a.muted}>—</span>;
  const csa = user.currentStudentAssignment;
  if (!csa) return <Chip tone="warning">Not assigned</Chip>;
  return (
    <div style={{ lineHeight: '18px' }}>
      <span className={a.cellTitle} style={{ fontSize: 13, fontWeight: 500 }}>
        {csa.departmentName ?? 'Department'}
        {csa.departmentCode && <span className={a.cellSub} style={{ display: 'inline' }}> ({csa.departmentCode})</span>}
      </span>
      <span className={a.cellSub}>{csa.academicYearName ?? '—'} · {csa.semesterTermName ?? '—'}</span>
    </div>
  );
}

export default function UserTable({
  users, loading, onEdit, onAssignRole, onSuspend, onDelete, onEditAcademic, emptyState,
}: Props) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users.update_institution') || hasPermission('users.update_all');

  const columns: TableColumnsType<User> = useMemo(() => [
    {
      title: 'User',
      key: 'user',
      render: (_, user) => (
        <div className={a.cell}>
          <Avatar
            size={36}
            src={user.avatarUrl}
            style={{ background: '#F59324', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          >
            {!user.avatarUrl && initials(user)}
          </Avatar>
          <Link href={`/users/${user.id}`} className={a.cellTitle}>
            {user.firstName} {user.lastName}
          </Link>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <span style={{ whiteSpace: 'nowrap' }}>{email}</span>,
    },
    {
      title: 'Role(s)',
      key: 'roles',
      render: (_, user) => <RoleChips user={user} />,
    },
    {
      title: 'Institution / Academic',
      key: 'academic',
      render: (_, user) => <AcademicCell user={user} />,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, user) => <StatusChip status={user.status} />,
    },
    {
      title: 'Last Login',
      key: 'lastLogin',
      render: (_, user) => user.lastLoginAt
        ? <span style={{ whiteSpace: 'nowrap' }} title={new Date(user.lastLoginAt).toLocaleString()}>{formatWhen(user.lastLoginAt)}</span>
        : <span className={a.muted}>Never</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      width: canManage ? 176 : 64,
      render: (_, user) => {
        const isStudent = user.roles.some((r) => r.name === 'student');
        const name = `${user.firstName} ${user.lastName}`;
        const suspended = user.status === 'suspended';
        return (
          <span className={a.rowActions}>
            <Tooltip title="Edit user">
              <Button size="small" icon={<EditOutlined />} aria-label={`Edit ${name}`} onClick={() => onEdit(user)} />
            </Tooltip>
            {canManage && isStudent && onEditAcademic && (
              <Tooltip title="Edit academic assignment">
                <Button size="small" icon={<BookOutlined />} aria-label={`Edit academic assignment for ${name}`} onClick={() => onEditAcademic(user)} />
              </Tooltip>
            )}
            {canManage && (
              <>
                <Tooltip title="Manage roles">
                  <Button size="small" icon={<SafetyCertificateOutlined />} aria-label={`Manage roles for ${name}`} onClick={() => onAssignRole(user)} />
                </Tooltip>
                <Tooltip title={suspended ? 'Activate user' : 'Suspend user'}>
                  <Button
                    size="small"
                    icon={suspended ? <CheckCircleOutlined /> : <StopOutlined />}
                    aria-label={`${suspended ? 'Activate' : 'Suspend'} ${name}`}
                    onClick={() => onSuspend(user)}
                    style={{ color: suspended ? '#059669' : '#D97706' }}
                  />
                </Tooltip>
                <Popconfirm
                  title={`Delete ${name}?`}
                  description="This removes the user account. This cannot be undone."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(user)}
                >
                  <Tooltip title="Delete user">
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${name}`} />
                  </Tooltip>
                </Popconfirm>
              </>
            )}
          </span>
        );
      },
    },
  ], [canManage, onEdit, onEditAcademic, onAssignRole, onSuspend, onDelete]);

  return (
    <Table<User>
      dataSource={users}
      columns={columns}
      rowKey="id"
      loading={loading}
      // The page pages through the API (20 per page) and renders its own pager.
      pagination={false}
      size="middle"
      scroll={{ x: 980 }}
      locale={emptyState ? { emptyText: loading ? ' ' : emptyState } : undefined}
    />
  );
}

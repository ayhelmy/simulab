'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/types';
import { Table, Avatar, Tag, Space, Button, Tooltip, Typography, type TableColumnsType } from 'antd';
import {
  EditOutlined, SafetyCertificateOutlined,
  StopOutlined, CheckCircleOutlined, DeleteOutlined, BookOutlined,
} from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';

const { Text } = Typography;

interface Props {
  users: User[];
  loading: boolean;
  onEdit:            (user: User) => void;
  onAssignRole:      (user: User) => void;
  onSuspend:         (user: User) => void;
  onDelete:          (user: User) => void;
  onEditAcademic?:   (user: User) => void;
}

export default function UserTable({
  users, loading, onEdit, onAssignRole, onSuspend, onDelete, onEditAcademic,
}: Props) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users.update_institution') || hasPermission('users.update_all');

  const columns: TableColumnsType<User> = [
    {
      title: 'User',
      key: 'user',
      render: (_, user) => (
        <Space>
          <Avatar
            size={36}
            src={user.avatarUrl}
            style={{ background: '#F59324', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          >
            {!user.avatarUrl && `${user.firstName[0]}${user.lastName[0]}`}
          </Avatar>
          <Link href={`/users/${user.id}`} style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
            {user.firstName} {user.lastName}
          </Link>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <span style={{ fontSize: 14, color: '#374151' }}>{email}</span>,
    },
    {
      title: 'Role(s)',
      key: 'roles',
      render: (_, user) => (
        <Space wrap size={4}>
          {user.roles.length
            ? user.roles.map((r) => <Tag key={r.id} color="blue" style={{ margin: 0 }}>{r.label}</Tag>)
            : <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>
          }
        </Space>
      ),
    },
    {
      title: 'Academic',
      key: 'academic',
      render: (_, user) => {
        const isStudent = user.roles.some((r) => r.name === 'student');
        if (!isStudent) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        const csa = user.currentStudentAssignment;
        if (!csa) return <Tag color="warning" style={{ fontSize: 11 }}>Not assigned</Tag>;
        return (
          <div style={{ fontSize: 12, lineHeight: '18px' }}>
            <div style={{ fontWeight: 500 }}>
              {csa.departmentName ?? csa.departmentId}
              {csa.departmentCode && <Text type="secondary"> ({csa.departmentCode})</Text>}
            </div>
            <Text type="secondary">
              {csa.academicYearName ?? '—'} · {csa.semesterTermName ?? '—'}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, user) => <StatusTag status={user.status} />,
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Suspended', value: 'suspended' },
        { text: 'Pending', value: 'pending' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Last Login',
      key: 'lastLogin',
      render: (_, user) => (
        <span style={{ fontSize: 13, color: '#6B7280' }}>
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, user) => {
        const isStudent = user.roles.some((r) => r.name === 'student');
        return (
          <Space size={4}>
            <Tooltip title="Edit user">
              <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(user)} />
            </Tooltip>
            {canManage && isStudent && onEditAcademic && (
              <Tooltip title="Edit academic assignment">
                <Button
                  size="small"
                  icon={<BookOutlined />}
                  onClick={() => onEditAcademic(user)}
                  style={{ color: '#7C3AED' }}
                />
              </Tooltip>
            )}
            {canManage && (
              <>
                <Tooltip title="Manage roles">
                  <Button size="small" icon={<SafetyCertificateOutlined />} onClick={() => onAssignRole(user)} />
                </Tooltip>
                <Tooltip title={user.status === 'suspended' ? 'Activate' : 'Suspend'}>
                  <Button
                    size="small"
                    icon={user.status === 'suspended' ? <CheckCircleOutlined /> : <StopOutlined />}
                    onClick={() => onSuspend(user)}
                    style={{ color: user.status === 'suspended' ? '#059669' : '#D97706' }}
                  />
                </Tooltip>
                <Tooltip title="Delete user">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDelete(user)}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table<User>
      dataSource={users}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 4 }}
      size="middle"
      scroll={{ x: 800 }}
    />
  );
}

'use client';

import { useState } from 'react';
import { assignRole, revokeRole } from '@/lib/users';
import type { User } from '@/types';
import { Modal, Select, Button, Tag, Space, Alert, Typography, Divider } from 'antd';

const { Text } = Typography;

const ASSIGNABLE_ROLES = [
  { value: 'student',               label: 'Student' },
  { value: 'instructor',            label: 'Instructor' },
  { value: 'teaching_assistant',    label: 'Teaching Assistant' },
  { value: 'content_creator',       label: 'Content Creator' },
  { value: 'simulation_developer',  label: 'Simulation Developer' },
  { value: 'dept_manager',          label: 'Department Manager' },
  { value: 'institution_admin',     label: 'Institution Admin' },
];

interface Props {
  user:      User;
  onClose:   () => void;
  onSuccess: () => void;
}

export default function RoleAssignModal({ user, onClose, onSuccess }: Props) {
  const [selectedRole, setSelectedRole] = useState<string | undefined>('student');
  const [assigning, setAssigning]       = useState(false);
  const [revoking, setRevoking]         = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const currentRoleNames = new Set<string>(user.roles.map((r) => r.name));
  const available = ASSIGNABLE_ROLES.filter((r) => !currentRoleNames.has(r.value));

  async function handleAssign() {
    if (!selectedRole) return;
    setAssigning(true);
    setError(null);
    try {
      await assignRole(user.id, selectedRole);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to assign role');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRevoke(roleId: string) {
    setRevoking(roleId);
    setError(null);
    try {
      await revokeRole(user.id, roleId);
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string };
      setError(e.title ?? 'Failed to revoke role');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Modal
      open
      title={`Roles — ${user.firstName} ${user.lastName}`}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Current roles */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 8 }}>
          Current Roles
        </Text>
        {user.roles.length === 0 ? (
          <Text type="secondary">No roles assigned.</Text>
        ) : (
          <Space orientation="vertical" style={{ width: '100%' }}>
            {user.roles.map((role) => (
              <div
                key={role.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB',
                }}
              >
                <Space>
                  <Tag color="blue" style={{ margin: 0 }}>{role.label}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>{role.name}</Text>
                </Space>
                <Button
                  danger
                  size="small"
                  loading={revoking === role.id}
                  onClick={() => handleRevoke(role.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </Space>
        )}
      </div>

      {/* Assign new role */}
      {available.length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 8 }}>
            Assign New Role
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              style={{ flex: 1 }}
              options={available}
            />
            <Button type="primary" loading={assigning} onClick={handleAssign}>
              Assign
            </Button>
          </Space.Compact>
        </>
      )}
    </Modal>
  );
}

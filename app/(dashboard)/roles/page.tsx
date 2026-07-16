'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouteGuard } from '@/hooks/useRouteGuard';
import PermissionMatrix from '@/components/roles/PermissionMatrix';
import { listRoles, listAllPermissions, createRole } from '@/lib/users';
import type { RoleWithPermissions, Permission } from '@/lib/users';
import {
  Card, Row, Col, Tag, Button, Modal, Form, Input, Checkbox, Typography,
  Spin, Alert, Space, Badge,
} from 'antd';
import { PlusOutlined, LockOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text } = Typography;

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const allowed = useRouteGuard('roles.manage');

  const [roles, setRoles]             = useState<RoleWithPermissions[]>([]);
  const [allPerms, setAllPerms]       = useState<Permission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<RoleWithPermissions | null>(null);
  const [createModal, setCreateModal] = useState(false);

  const canManage = hasPermission('roles.manage');

  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      listRoles(),
      listAllPermissions(),
    ]).then(([r, p]) => {
      setRoles(r);
      setAllPerms(p);
    }).catch((err: unknown) => {
      const e = err as { title?: string };
      setError(e.title ?? 'Failed to load roles');
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  const reload = async () => {
    const [r, p] = await Promise.all([listRoles(), listAllPermissions()]);
    setRoles(r);
    setAllPerms(p);
    setSelected((prev) => (prev ? (r.find((role) => role.id === prev.id) ?? null) : null));
  };

  if (!allowed) return null;
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error)   return <Alert type="error" title={error} showIcon />;

  const systemRoles = roles.filter((r) => r.is_system);
  const customRoles = roles.filter((r) => !r.is_system);

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle={`${roles.length} roles · ${allPerms.length} permission codes`}
        extra={
          canManage ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
              Create Role
            </Button>
          ) : undefined
        }
      />

      {/* System roles */}
      <div style={{ marginBottom: 28 }}>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>System Roles</Text>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Built-in roles — permissions can only be modified by super admins
        </Text>
        <Row gutter={[12, 12]}>
          {systemRoles.map((role) => (
            <Col key={role.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                hoverable
                onClick={() => setSelected(selected?.id === role.id ? null : role)}
                style={{
                  borderColor: selected?.id === role.id ? '#F59324' : undefined,
                  background: selected?.id === role.id ? '#FEF3E2' : undefined,
                }}
                size="small"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong>{role.label}</Text>
                  <Tag style={{ margin: 0 }}>system</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', minHeight: 32 }}>
                  {role.description ?? `${role.name} role`}
                </Text>
                <Text style={{ fontSize: 12, color: '#F59324', fontWeight: 600 }}>
                  {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {customRoles.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Custom Roles</Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            Institution-defined roles — permissions can be edited
          </Text>
          <Row gutter={[12, 12]}>
            {customRoles.map((role) => (
              <Col key={role.id} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  hoverable
                  onClick={() => setSelected(selected?.id === role.id ? null : role)}
                  style={{
                    borderColor: selected?.id === role.id ? '#F59324' : undefined,
                    background: selected?.id === role.id ? '#FEF3E2' : undefined,
                  }}
                  size="small"
                >
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>{role.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', minHeight: 32 }}>
                    {role.description ?? `${role.name} role`}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#F59324', fontWeight: 600 }}>
                    {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 24 }}>
          <PermissionMatrix
            role={selected}
            allPermissions={allPerms}
            canEdit={canManage && !selected.is_system}
            onUpdated={reload}
          />
        </div>
      )}

      {createModal && (
        <CreateRoleModal
          allPermissions={allPerms}
          onClose={() => setCreateModal(false)}
          onSuccess={() => { setCreateModal(false); reload(); }}
        />
      )}
    </div>
  );
}

// -- Create Role Modal --------------------------------------------------------─

function CreateRoleModal({
  allPermissions, onClose, onSuccess,
}: {
  allPermissions: Permission[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm();
  const [saving, setSaving]   = useState(false);
  const [codes, setCodes]     = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);

  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.resource] ??= []).push(p);
    return acc;
  }, {});

  const toggle = (code: string) => {
    setCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  async function handleFinish(values: { name: string; label: string; description?: string }) {
    setSaving(true);
    setFormError(null);
    try {
      await createRole({
        name:            values.name,
        label:           values.label,
        description:     values.description || undefined,
        permissionCodes: [...codes],
      });
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string };
      setFormError(e.title ?? 'Failed to create role');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={<><LockOutlined /> Create Custom Role</>}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Create Role"
      confirmLoading={saving}
      width={560}
      destroyOnHidden
    >
      {formError && (
        <Alert type="error" title={formError} showIcon style={{ marginBottom: 16 }} />
      )}

      <Form form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="Name (machine ID)"
              name="name"
              rules={[
                { required: true, message: 'Required.' },
                { pattern: /^[a-z0-9_]+$/, message: 'Lowercase letters, digits, underscores only.' },
              ]}
            >
              <Input placeholder="e.g. lab_reviewer" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Display Label"
              name="label"
              rules={[{ required: true, message: 'Required.' }]}
            >
              <Input placeholder="e.g. Lab Reviewer" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Description (optional)" name="description">
          <Input placeholder="Brief description of this role's purpose" />
        </Form.Item>
      </Form>

      {allPermissions.length > 0 && (
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Permissions <Badge count={codes.size} showZero color="#F59324" />
          </Text>
          <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 6, padding: 8 }}>
            {Object.entries(grouped).map(([resource, perms]) => (
              <div key={resource} style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                  {resource}
                </Text>
                <Space orientation="vertical" size={2} style={{ width: '100%' }}>
                  {perms.map((p) => (
                    <Checkbox
                      key={p.id}
                      checked={codes.has(p.code)}
                      onChange={() => toggle(p.code)}
                    >
                      <Text style={{ fontSize: 13 }}>
                        <strong>{p.action}</strong> — {p.description ?? p.code}
                      </Text>
                    </Checkbox>
                  ))}
                </Space>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

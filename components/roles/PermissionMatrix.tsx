'use client';

import { useState, useEffect } from 'react';
import { Tag, Typography, App } from 'antd';
import { addRolePermission, removeRolePermission } from '@/lib/users';
import type { RoleWithPermissions, Permission } from '@/lib/users';

const { Text } = Typography;

interface Props {
  role:           RoleWithPermissions;
  allPermissions: Permission[];
  canEdit:        boolean;
  onUpdated:      () => void;
}

export default function PermissionMatrix({ role, allPermissions, canEdit, onUpdated }: Props) {
  const { message }  = App.useApp();
  const [busy, setBusy]           = useState<string | null>(null);
  const [localGranted, setLocalGranted] = useState<Set<string>>(() => new Set(role.permissions));

  useEffect(() => {
    setLocalGranted(new Set(role.permissions));
  }, [role.id, role.permissions.length]);

  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.resource] ??= []).push(p);
    return acc;
  }, {});

  const handleToggle = async (perm: Permission, granted: boolean) => {
    setLocalGranted(prev => {
      const next = new Set(prev);
      granted ? next.delete(perm.code) : next.add(perm.code);
      return next;
    });
    setBusy(perm.code);
    try {
      if (!granted) await addRolePermission(role.id, perm.code);
      else          await removeRolePermission(role.id, perm.id);
      onUpdated();
    } catch (err: unknown) {
      setLocalGranted(new Set(role.permissions));
      const e = err as { title?: string };
      message.error(e.title ?? 'Failed to update permission');
    } finally {
      setBusy(null);
    }
  };

  const resources = Object.keys(grouped).sort();

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <Text strong style={{ fontSize: 15, display: 'block' }}>
            {role.label} — Permission Matrix
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {localGranted.size} of {allPermissions.length} permissions granted
            {role.is_system && ' · System role (read-only)'}
          </Text>
        </div>
        {canEdit && <Tag color="green">Editable</Tag>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {resources.map(resource => (
          <div key={resource} style={{ border: '1px solid #F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '0.5rem 0.75rem', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {resource}
              </Text>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {grouped[resource].map(perm => {
                const granted = localGranted.has(perm.code);
                const isBusy  = busy === perm.code;
                return (
                  <div
                    key={perm.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.375rem 0.75rem',
                      background: granted ? '#F0FDF4' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: 600, color: granted ? '#065F46' : '#374151', display: 'block' }}>
                        {perm.action}
                      </Text>
                      {perm.description && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {perm.description}
                        </Text>
                      )}
                    </div>
                    {canEdit ? (
                      <button
                        onClick={() => handleToggle(perm, granted)}
                        disabled={isBusy}
                        style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: granted ? '#059669' : '#D1D5DB',
                          border: 'none', cursor: isBusy ? 'wait' : 'pointer',
                          position: 'relative', transition: 'background 0.2s',
                          flexShrink: 0, marginLeft: 8,
                        }}
                        aria-label={`${granted ? 'Revoke' : 'Grant'} ${perm.code}`}
                      >
                        <span style={{
                          position: 'absolute', top: 2,
                          left: granted ? 18 : 2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                    ) : (
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: granted ? '#059669' : '#D1D5DB', flexShrink: 0, marginLeft: 8 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

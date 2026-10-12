'use client';

/**
 * Notification bell with unread badge + dropdown panel.
 * SRS §4.12 NOT-01, NOT-03, NOT-04.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Dropdown, List, Button, Empty, Spin, Typography, Tag } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification } from '@/types';

const { Text } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  low: 'default', normal: 'blue', high: 'orange', urgent: 'red',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) refresh();
  }

  function handleClickNotification(n: Notification) {
    markRead(n.id);
    setOpen(false);
    const actionUrl = n.data?.actionUrl;
    if (typeof actionUrl === 'string') router.push(actionUrl);
  }

  const panel = (
    <div style={{ width: 360, background: 'var(--ant-color-bg-elevated, #fff)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong>Notifications</Text>
        <Button
          type="link" size="small" icon={<CheckOutlined />}
          disabled={unreadCount === 0}
          onClick={() => markAllRead()}
        >
          Mark all read
        </Button>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : notifications.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No new notifications" style={{ padding: '24px 0' }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(n) => (
              <List.Item
                onClick={() => handleClickNotification(n)}
                style={{ cursor: 'pointer', padding: '10px 14px', alignItems: 'flex-start' }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>{n.title}</Text>
                    {(n.priority === 'high' || n.priority === 'urgent') && (
                      <Tag color={PRIORITY_COLOR[n.priority]} style={{ marginRight: 0 }}>{n.priority}</Tag>
                    )}
                  </div>
                  {n.body && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{n.body}</Text>}
                  <Text type="secondary" style={{ fontSize: 11 }}>{timeAgo(n.createdAt)}</Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
      <div style={{ borderTop: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
        <Button type="link" size="small" onClick={() => { setOpen(false); router.push('/notifications'); }}>
          View all notifications
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown popupRender={() => panel} trigger={['click']} open={open} onOpenChange={handleOpenChange} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <BellOutlined
          style={{ fontSize: 18, color: '#6B7280', cursor: 'pointer' }}
          aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ''}`}
        />
      </Badge>
    </Dropdown>
  );
}

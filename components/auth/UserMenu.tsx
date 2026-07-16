'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Dropdown, Typography, type MenuProps } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';

const { Text } = Typography;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const primaryRole = user.roles[0]?.label ?? 'User';

  const items: MenuProps['items'] = [
    {
      key: 'header',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {user.firstName} {user.lastName}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: async () => {
        // Flag must be set BEFORE logout() so the dashboard layout's !user effect
        // sees it synchronously and skips the /login redirect.
        sessionStorage.setItem('_logout', '1');
        await logout();
        router.replace('/');
      },
    },
  ];

  const avatarNode = user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatarUrl}
      alt={`${user.firstName} ${user.lastName}`}
      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <Avatar
      size={32}
      style={{ background: '#F59324', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
    >
      {getInitials(user.firstName, user.lastName)}
    </Avatar>
  );

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      {/* button wrapper satisfies keyboard/screen-reader access (Issue #9) */}
      <button
        type="button"
        aria-label={`User menu — ${user.firstName} ${user.lastName}`}
        aria-haspopup="menu"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          background: 'none', border: 'none', padding: '4px 6px', borderRadius: 6,
          outline: 'none',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
        }}
      >
        {avatarNode}
        <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
          <Text strong style={{ fontSize: 13, display: 'block' }}>
            {user.firstName} {user.lastName}
          </Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
            {primaryRole}
          </Text>
        </div>
      </button>
    </Dropdown>
  );
}

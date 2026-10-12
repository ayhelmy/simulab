'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout, Menu, Button, Drawer, Avatar, Dropdown, Space, Typography,
  type MenuProps,
} from 'antd';
import {
  MenuOutlined, UserOutlined,
  DashboardOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const { Header } = Layout;
const { Text } = Typography;

const NAV_ITEMS: MenuProps['items'] = [
  { key: '/',              label: 'Home' },
  { key: '/public-catalog', label: 'Simulation Catalog' },
  { key: '/about',         label: 'About us' },
  { key: '/resources',     label: 'Resources' },
];

interface Props {
  /** Extra vertical offset (px) to sit below a fixed bar above the header, e.g. the home page's announcement bar. */
  topOffset?: number;
}

export default function PublicHeader({ topOffset = 0 }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLoggedIn = !loading && !!user;

  // Highlight the active nav item
  const selectedKeys = (NAV_ITEMS ?? [])
    .filter((item): item is { key: string; label: string } => item != null && 'key' in (item as object))
    .map((item) => item.key)
    .filter((key) => key === '/' ? pathname === '/' : pathname.startsWith(key));

  function handleNavClick({ key }: { key: string }) {
    setDrawerOpen(false);
    router.push(key);
  }

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => router.push('/dashboard'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: async () => {
        await logout();
        router.push('/');
      },
    },
  ];

  return (
    <Header className="public-header" style={{ top: topOffset }}>
      {/* Logo */}
      <button className="public-logo" onClick={() => router.push('/')} aria-label="BEDO home">
        <Image src="/bedo-logo.png" alt="BEDO" width={75} height={32} style={{ display: 'block' }} priority />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0D1117' }}>SimuLearn</span>
      </button>

      {/* Desktop nav */}
      <nav className="public-nav-desktop" aria-label="Main navigation">
        <Menu
          mode="horizontal"
          items={NAV_ITEMS}
          onClick={handleNavClick}
          selectedKeys={selectedKeys}
          className="public-nav-menu"
        />
      </nav>

      {/* Right: auth actions */}
      <div className="public-header-right">
        {loading ? null : isLoggedIn ? (
          <Dropdown menu={{ items: userDropdownItems }} placement="bottomRight" arrow>
            <button className="public-user-btn" aria-label="User menu">
              <Avatar
                size={34}
                src={user.avatarUrl}
                icon={!user.avatarUrl ? <UserOutlined /> : undefined}
                style={{ background: '#F59324', cursor: 'pointer' }}
              />
              <Text className="public-user-name">
                {user.firstName}
              </Text>
            </button>
          </Dropdown>
        ) : (
          <Space size={8}>
            <Button
              type="text"
              onClick={() => router.push('/login')}
              className="public-btn-login"
              style={{ fontWeight: 800 }}
            >
              Login
            </Button>
            <Button
              type="primary"
              onClick={() => router.push('/register')}
              className="public-btn-demo"
            >
              Book Demo
            </Button>
          </Space>
        )}

        {/* Mobile hamburger */}
        <Button
          className="public-mobile-menu-btn"
          icon={<MenuOutlined />}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
        />
      </div>

      {/* Mobile drawer */}
      <Drawer
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/bedo-logo.png" alt="BEDO" width={110} height={39} style={{ display: 'block' }} />
            <span style={{ fontSize: 17, fontWeight: 700, color: '#0D1117' }}>SimuLearn</span>
          </span>
        }
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        size={280}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          mode="inline"
          items={NAV_ITEMS}
          onClick={handleNavClick}
          selectedKeys={selectedKeys}
          style={{ border: 'none' }}
        />
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
          {isLoggedIn ? (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button block onClick={() => { setDrawerOpen(false); router.push('/dashboard'); }}>
                Dashboard
              </Button>
              <Button block danger onClick={async () => { setDrawerOpen(false); await logout(); router.push('/'); }}>
                Sign Out
              </Button>
            </Space>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button block onClick={() => { setDrawerOpen(false); router.push('/login'); }}>
                Log In
              </Button>
              <Button block type="primary" onClick={() => { setDrawerOpen(false); router.push('/register'); }}>
                Get Started
              </Button>
            </Space>
          )}
        </div>
      </Drawer>
    </Header>
  );
}

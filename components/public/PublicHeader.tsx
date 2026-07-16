'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout, Menu, Button, Drawer, Avatar, Dropdown, Space, Typography,
  type MenuProps,
} from 'antd';
import {
  MenuOutlined, ExperimentOutlined, UserOutlined,
  DashboardOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const { Header } = Layout;
const { Text } = Typography;

const NAV_ITEMS: MenuProps['items'] = [
  { key: '/',              label: 'Home' },
  { key: '/public-catalog',       label: 'Simulation Catalog' },
  { key: '/disciplines',   label: 'Disciplines' },
  { key: '/why-simlearn',  label: 'Why BEDO' },
  { key: '/resources',     label: 'Resources' },
  { key: '/about',         label: 'About Us' },
];

export default function PublicHeader() {
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
    <Header className="public-header">
      {/* Logo */}
      <button className="public-logo" onClick={() => router.push('/')} aria-label="BEDO home">
        <img src="/bedo-logo.png" alt="BEDO" style={{ height: 46, display: 'block' }} />
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
              onClick={() => router.push('/login')}
              className="public-btn-login"
            >
              Log In
            </Button>
            <Button
              type="primary"
              onClick={() => router.push('/register')}
              className="public-btn-demo"
              icon={<ExperimentOutlined />}
            >
              Get Started
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
          <img src="/bedo-logo.png" alt="BEDO" style={{ height: 46, display: 'block' }} />
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

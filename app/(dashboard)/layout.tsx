'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Layout, Menu, Spin, Breadcrumb, type MenuProps,
} from 'antd';
import {
  AppstoreOutlined, BookOutlined, ExperimentOutlined,
  BarChartOutlined, MessageOutlined, LineChartOutlined,
  TeamOutlined, SafetyCertificateOutlined, BankOutlined,
  SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  BellOutlined, AppstoreAddOutlined,
  AuditOutlined, EditOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
import UserMenu from '@/components/auth/UserMenu';

const { Sider, Header, Content } = Layout;

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  anyPermission?: string[];
  /** Hide this item when the signed-in user has any of these roles. */
  excludeRoles?: string[];
}

// -- Nav sections — permission codes use dot-notation (RBAC v2 §12) ------------

const LEARNING_NAV: NavItem[] = [
  {
    key: '/courses', label: 'Courses', icon: <BookOutlined />,
    anyPermission: ['courses.view_own', 'courses.view_institution', 'courses.view_all', 'courses.view_department'],
    excludeRoles: ['super_admin'],
  },
  {
    key: '/simulations', label: 'Simulations', icon: <ExperimentOutlined />,
    anyPermission: ['simulations.view_catalog', 'simulations.view_demo', 'simulation_catalogs.view_assigned'],
  },
  {
    key: '/gradebook', label: 'Gradebook', icon: <BarChartOutlined />,
    anyPermission: ['grades.view_own', 'grades.view_course', 'grades.view_department'],
    excludeRoles: ['super_admin'],
  },
  {
    key: '/messages', label: 'Messages', icon: <MessageOutlined />,
    anyPermission: ['messages.send', 'messages.view'],
  },
  {
    key: '/analytics', label: 'Analytics', icon: <LineChartOutlined />,
    anyPermission: ['platform.reports.view'],
  },
];

const MANAGEMENT_NAV: NavItem[] = [
  {
    key: '/users', label: 'Users', icon: <TeamOutlined />,
    anyPermission: ['users.view_institution', 'users.view_all', 'users.view_department'],
  },
  // {
  //   key: '/departments', label: 'Departments', icon: <ApartmentOutlined />,
  //   anyPermission: ['departments.view', 'departments.create', 'departments.manage'],
  //   excludeRoles: ['super_admin'],
  // },
  {
    key: '/institutions', label: 'Institutions', icon: <BankOutlined />,
    anyPermission: ['institutions.view_own', 'institutions.view_all'],
  },
];

const PLATFORM_NAV: NavItem[] = [
  {
    key: '/simulation-catalogs', label: 'Sim Catalogs', icon: <AppstoreAddOutlined />,
    anyPermission: ['simulation_catalogs.manage_global', 'simulation_catalogs.view_assigned'],
  },
  {
    key: '/roles', label: 'Roles', icon: <SafetyCertificateOutlined />,
    anyPermission: ['roles.manage'],
    excludeRoles: ['institution_admin'],
  },
  {
    key: '/settings', label: 'Settings', icon: <SettingOutlined />,
    anyPermission: ['platform.settings.manage', 'institutions.manage_own'],
  },
  {
    key: '/audit-logs', label: 'Audit Logs', icon: <AuditOutlined />,
    anyPermission: ['platform.audit.view', 'audit.view_institution'],
  },
  {
    key: '/page-content', label: 'Page Content', icon: <EditOutlined />,
    anyPermission: ['platform.settings.manage'],
  },
];

const ALL_NAV_ITEMS: NavItem[] = [
  { key: '/dashboard', label: 'Dashboard', icon: <AppstoreOutlined /> },
  ...LEARNING_NAV,
  ...MANAGEMENT_NAV,
  ...PLATFORM_NAV,
];

function getSelectedKey(pathname: string): string {
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.key.length - a.key.length);
  const match = sorted.find((item) => pathname === item.key || pathname.startsWith(item.key + '/'));
  return match?.key ?? '/dashboard';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasAnyPermission, hasRole } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    // pathname '/' means we're transitioning to the public landing page — don't redirect.
    // '_logout' flag means the user intentionally signed out — let UserMenu's router.replace('/') win.
    console.log('DashboardLayout useEffect: checking auth status', { pathname, logoutFlag: sessionStorage.getItem('_logout') });
    if (pathname === '/' || sessionStorage.getItem('_logout') === '1') return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return null;

  function isVisible(item: NavItem): boolean {
    if (item.excludeRoles?.some((r) => hasRole(r))) return false;
    if (!item.anyPermission) return true;
    return hasAnyPermission(...item.anyPermission);
  }

  function buildMenuItems(): MenuProps['items'] {
    const items: MenuProps['items'] = [];

    items.push({ key: '/dashboard', icon: <AppstoreOutlined />, label: 'Dashboard' });

    const learningVisible = LEARNING_NAV.filter(isVisible);
    if (learningVisible.length > 0) {
      items.push({ type: 'divider' });
      learningVisible.forEach((n) => items.push({ key: n.key, icon: n.icon, label: n.label }));
    }

    const mgmtVisible = MANAGEMENT_NAV.filter(isVisible);
    if (mgmtVisible.length > 0) {
      items.push({ type: 'divider' });
      mgmtVisible.forEach((n) => items.push({ key: n.key, icon: n.icon, label: n.label }));
    }

    const platformVisible = PLATFORM_NAV.filter(isVisible);
    if (platformVisible.length > 0) {
      items.push({ type: 'divider' });
      platformVisible.forEach((n) => items.push({ key: n.key, icon: n.icon, label: n.label }));
    }

    return items;
  }

  const selectedKey = getSelectedKey(pathname);

  function buildBreadcrumbs() {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: { title: React.ReactNode }[] = [{ title :<a href="/">Home</a> }];
    let path = '';
    // remove the first segment if it's "dashboard"
    if (segments[0] === 'dashboard') segments.shift();
    // remove the last segment if it's a numeric ID (e.g., /courses/123)
    // console.log('Current pathname:', segments[segments.length - 1]);
    // console.log('Segments before filtering:',  typeof segments[segments.length - 1] === 'string' ? segments[segments.length - 1] : null);
    if (segments.length > 0 &&   /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segments[segments.length - 1])) {
      console.log('Removing last segment from breadcrumbs because it is a numeric ID:', segments[segments.length - 1]);
      segments.pop();
    }
    for (const seg of segments) {

      path += `/${seg}`;
      const nav = ALL_NAV_ITEMS.find((n) => n.key === path);
      crumbs.push({ title:
        <a onClick={() => router.push(nav?.key ?? path)}>{nav?.label ?? seg.charAt(0).toUpperCase() + seg.slice(1)}</a> });
    }
    return crumbs;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* -- Sidebar ------------------------------------------------------─ */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}

        width={220}
        collapsedWidth={64}
        trigger={null}
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0, top: 0, bottom: 0,
          zIndex: 100,
          overflow: 'auto',
          background: '#EEF0F2',
          borderRight: '1px solid #d5d6d8',
          //add shadow to the right of the sidebar
          boxShadow: '2px 0 6px rgba(0, 0, 0, 0.16)',
        }}
      >
        {/* Logo */}
        <div className="simlearn-logo">
          <div className="simlearn-logo-icon">
            {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg> */}
            <img src="/Virtual-logo.png" alt="SimuLearn Logo" style={{ width: 50, height: 40 }} />
          </div>
          {!collapsed && (
            <span style={{  fontWeight: 800, fontSize: 15, marginLeft: 10, whiteSpace: 'nowrap' }}>
              Bedo SimuLearn
            </span>
          )}
        </div>

        <Menu
          // theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={buildMenuItems()}
          onClick={({ key }: { key: string }) => router.push(key)}
          style={{ borderRight: 0, marginTop: 4  ,backgroundColor: '#EEF0F2', color: 'white', fontSize: 13, fontWeight: 500 }}
        />
      </Sider>
      

      {/* -- Main area ----------------------------------------------------─ */}
      <Layout
        style={{
          marginLeft: collapsed ? 64 : 220,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Top header */}
        <Header className="dashboard-header" style={{ height: 60, lineHeight: '60px' ,backgroundColor: '#a8d2e7', padding: '0 1rem', display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, cursor: 'pointer', color: '#374151', padding: '0 8px' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>

          <Breadcrumb
            items={buildBreadcrumbs()}
            style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#6B7280', flex: 1, marginLeft: 16 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BellOutlined style={{ fontSize: 18, color: '#6B7280', cursor: 'pointer' }} />
            <UserMenu />
          </div>
        </Header>

        {/* Page content */}
        <Content
          style={{
            padding: '1.5rem',
            minHeight: 'calc(100vh - 60px)',
            background: '#EEF0F2',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

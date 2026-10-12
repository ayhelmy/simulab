'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Layout, Menu, Spin, Breadcrumb, ConfigProvider, type MenuProps,
} from 'antd';
import {
  AppstoreOutlined, BookOutlined, ExperimentOutlined,
  BarChartOutlined, MailOutlined, LineChartOutlined,
  TeamOutlined, SafetyCertificateOutlined, BankOutlined,
  SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  BellOutlined, AppstoreAddOutlined,
  AuditOutlined, EditOutlined, ApiOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/layout/NotificationBell';
import { BEDO_APP_THEME, BEDO_SKIN_ROLES } from '@/components/layout/bedoAppTheme';
import skin from '@/components/layout/BedoAppSkin.module.css';

const { Sider, Header, Content } = Layout;

const HEADER_HEIGHT = 60;

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
    key: '/mail', label: 'Messages', icon: <MailOutlined />,
    anyPermission: ['messages.send', 'messages.view'],
  },
  {
    key: '/notifications', label: 'Notifications', icon: <BellOutlined />,
    anyPermission: ['notifications.view'],
  },
  // {
  //   key: '/analytics', label: 'Analytics', icon: <LineChartOutlined />,
  //   anyPermission: ['platform.reports.view'],
  // },
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
  // {
  //   key: '/audit-logs', label: 'Audit Logs', icon: <AuditOutlined />,
  //   anyPermission: ['platform.audit.view', 'audit.view_institution'],
  // },
  // {
  //   key: '/page-content', label: 'Page Content', icon: <EditOutlined />,
  //   anyPermission: ['platform.settings.manage'],
  // },
  // {
  //   key: '/lti-settings', label: 'LTI Integration', icon: <ApiOutlined />,
  //   anyPermission: ['lti_platforms.view_own', 'lti_platforms.view_all'],
  // },
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

// Below 768px the sidebar leaves the layout and opens as an overlay from the
// header menu button, so page content gets the full viewport width.
const MOBILE_QUERY = '(max-width: 767px)';
function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasAnyPermission, hasRole } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
  // On mobile the sidebar is either fully open (overlay) or fully hidden.
  const siderCollapsed = isMobile ? !mobileNavOpen : collapsed;
  const mobileOverlay = isMobile && mobileNavOpen;

  // Escape closes the mobile overlay.
  useEffect(() => {
    if (!mobileOverlay) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOverlay]);

  // Instructor / TA / student interface gets the BEDO design-system skin;
  // admin-facing roles keep the current shell look.
  const bedoSkin = !!user && BEDO_SKIN_ROLES.some((r) => hasRole(r));

  // Modals, drawers and dropdowns render into <body>, outside <Content>, so the
  // skin class also goes on <body> while this shell is mounted.
  useEffect(() => {
    if (!bedoSkin) return;
    document.body.classList.add(skin.root);
    return () => document.body.classList.remove(skin.root);
  }, [bedoSkin]);

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
  // Width of the sidebar beside the content; the fixed header starts at the same edge.
  const contentOffset = isMobile ? 0 : collapsed ? 64 : 220;

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
    <ConfigProvider theme={bedoSkin ? BEDO_APP_THEME : undefined}>
    <Layout style={{ minHeight: '100vh' }}>
      {/* -- Sidebar ------------------------------------------------------─ */}
      <Sider
        id="app-sidebar"
        collapsible
        collapsed={siderCollapsed}
        onCollapse={setCollapsed}

        width={220}
        collapsedWidth={isMobile ? 0 : 64}
        trigger={null}
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0, top: 0, bottom: 0,
          zIndex: 100,
          overflow: 'auto',
          background: '#EEF0F2',
          // Hidden mobile sidebar has zero width — drop its edge so nothing shows.
          borderRight: isMobile && !mobileNavOpen ? 'none' : bedoSkin ? '1px solid #DDDEDF' : '1px solid #d5d6d8',
          //add shadow to the right of the sidebar
          boxShadow: isMobile && !mobileNavOpen ? 'none' : '2px 0 6px rgba(0, 0, 0, 0.16)',
        }}
      >
        {/* Logo */}
        <div className="simlearn-logo">
          <div className="simlearn-logo-icon">
            {/* <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg> */}
            <Image src="/Virtual-logo.png" alt="SimuLearn Logo" width={50} height={40} />
          </div>
          {!siderCollapsed && (
            <span style={{  fontWeight: 800, fontSize: 15, marginLeft: 10, whiteSpace: 'nowrap' }}>
              BEDO SimuLearn
            </span>
          )}
        </div>

        <Menu
          // theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={buildMenuItems()}
          onClick={({ key }: { key: string }) => { setMobileNavOpen(false); router.push(key); }}
          style={{ borderRight: 0, marginTop: 4  ,backgroundColor: '#EEF0F2', color: 'white', fontSize: 13, fontWeight: 500 }}
        />
      </Sider>

      {/* Mobile: the open sidebar overlays the page; tapping outside closes it. */}
      {mobileOverlay && (
        <div
          aria-hidden
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0, 0, 0, 0.45)' }}
        />
      )}

      {/* -- Main area ----------------------------------------------------─ */}
      <Layout
        style={{
          marginLeft: contentOffset,
          transition: 'margin-left 0.2s',
          minWidth: 0,
          // Reserves the fixed header's height so page content never starts underneath it.
          paddingTop: HEADER_HEIGHT,
        }}
      >
        {/* Top header — fixed rather than sticky: antd's modal scroll-lock puts
            overflow on <body>, which would detach a sticky header while a modal is open.
            Below the sidebar (z 100) and its mobile overlay (z 99); above page content. */}
        <Header
          className="dashboard-header"
          style={{
            height: HEADER_HEIGHT, lineHeight: `${HEADER_HEIGHT}px`, padding: isMobile ? '0 0.5rem' : '0 1rem', display: 'flex', alignItems: 'center',
            position: 'fixed', top: 0, left: contentOffset, right: 0, zIndex: 10, transition: 'left 0.2s',
            ...(bedoSkin
              ? { backgroundColor: '#FFFFFF', borderBottom: '1px solid #DDDEDF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
              : { backgroundColor: '#a8d2e7', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }),
          }}
        >
          <span
            role="button"
            tabIndex={0}
            aria-label={siderCollapsed ? 'Open navigation' : 'Close navigation'}
            aria-controls="app-sidebar"
            aria-expanded={!siderCollapsed}
            onClick={() => (isMobile ? setMobileNavOpen((o) => !o) : setCollapsed(!collapsed))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              if (isMobile) setMobileNavOpen((o) => !o); else setCollapsed(!collapsed);
            }}
            style={{ fontSize: 18, cursor: 'pointer', color: '#374151', padding: '0 8px' }}
          >
            {siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>

          {/* The breadcrumb wraps into several lines on phones; there the page title carries context. */}
          {isMobile ? (
            <span style={{ flex: 1 }} />
          ) : (
            <Breadcrumb
              items={buildBreadcrumbs()}
              style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#6B7280', flex: 1, marginLeft: 16 }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <UserMenu />
          </div>
        </Header>

        {/* Page content */}
        <Content
          className={['app-content', bedoSkin ? skin.root : ''].filter(Boolean).join(' ')}
          style={{
            padding: isMobile ? '1rem 0.75rem' : '1.5rem',
            minHeight: 'calc(100vh - 60px)',
            background: '#EEF0F2',
          }}
        >
          {/* Background stays full width; page content is centred and capped on large screens. */}
          <div className="app-page-container">{children}</div>
        </Content>
      </Layout>
    </Layout>
    </ConfigProvider>
  );
}

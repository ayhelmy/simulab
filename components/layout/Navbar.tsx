'use client';

/**
 * Top navigation bar — logo, search, notification bell, user menu.
 * SRS §6.2 UI layout.
 * TODO: implement (skeleton only)
 */

import { useAuth } from '@/context/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', height: 64, borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Bedo SimuLearn</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <NotificationBell />
        <span>{user?.firstName} {user?.lastName}</span>
        <button onClick={logout}>Sign out</button>
      </div>
    </header>
  );
}

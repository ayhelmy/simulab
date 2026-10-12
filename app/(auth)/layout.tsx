'use client';

import React, { Suspense } from 'react';
import Image from 'next/image';
import { Spin } from 'antd';
import { useGuestOnly } from '@/hooks/useGuestOnly';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const canRender = useGuestOnly();

  if (!canRender) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg">
      {/* Brand */}
      <div className="auth-brand">
        <div className="auth-brand-badge">
          <Image src="/Virtual-logo-1.png" alt="SimuLearn Logo" width={50} height={40} />

          <span style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>
           Bedo SimuLearn
          </span>
        </div>
        <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>Simulation-based learning platform</p>
      </div>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '2rem',
        }}
      >
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>}>
          <AuthGuard>{children}</AuthGuard>
        </Suspense>
      </div>

      <p style={{ marginTop: '1.5rem', color: '#9CA3AF', fontSize: 12 }}>
        © {new Date().getFullYear()} SimuLearn · All rights reserved
      </p>
    </div>
  );
}

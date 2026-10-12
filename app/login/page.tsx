'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useGuestOnly } from '@/hooks/useGuestOnly';
import { colors } from '@/components/home/homeTheme';
import Logo from '@/components/auth/Logo';
import AuthForm from '@/components/auth/AuthForm';
import SideImage from '@/components/auth/SideImage';

function LoginContent() {
  const canRender = useGuestOnly();

  if (!canRender) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="auth-split-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />
          <Link
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: colors.body, textDecoration: 'none' }}
          >
            <ArrowLeftOutlined /> Back to Home
          </Link>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ maxWidth: 420, width: '100%', margin: '0 auto' }}>
            <AuthForm />
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
          © {new Date().getFullYear()} BEDO · Browser-based 3D simulations for engineering and computer science
        </p>
      </div>

      <div className="auth-side-image-col">
        <SideImage />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

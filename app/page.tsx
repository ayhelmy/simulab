'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuth } from '@/context/AuthContext';
import HomeBanner from '@/components/home/HomeBannar'; ;

function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    sessionStorage.removeItem('_logout');
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return <HomeBanner />;
}

export default function Page() {
  return (
    <Suspense>
      <RootPage />
    </Suspense>
  );
}

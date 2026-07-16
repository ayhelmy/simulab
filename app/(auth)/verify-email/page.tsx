'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { verifyEmail, resendVerification } from '@/lib/auth';
import type { ApiError } from '@/types/api';
import { Spin, Result, Input, Button, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

type Status = 'verifying' | 'success' | 'error' | 'no_token';

export default function VerifyEmailPage() {
  const router  = useRouter();
  const params  = useSearchParams();
  const { login: setAuthState } = useAuth();

  const token = params.get('token');

  const [status, setStatus]               = useState<Status>(token ? 'verifying' : 'no_token');
  const [error, setError]                 = useState<string | null>(null);
  const [resendEmail, setResendEmail]     = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]       = useState(false);

  useEffect(() => {
    if (!token) return;
    verifyEmail(token)
      .then(({ accessToken, user }) => {
        setAuthState(user, accessToken);
        setStatus('success');
        setTimeout(() => router.replace('/dashboard'), 2000);
      })
      .catch((err: ApiError) => {
        setError(err.title || 'Verification failed. The link may have expired.');
        setStatus('error');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend() {
    if (!resendEmail) return;
    setResendLoading(true);
    try {
      await resendVerification(resendEmail);
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  }

  if (status === 'verifying') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#6B7280', fontSize: 14 }}>Verifying your email address…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#059669' }} />}
        title="Email verified!"
        subTitle="Your account is now active. Redirecting to your dashboard…"
        style={{ padding: '1rem 0' }}
      />
    );
  }

  return (
    <Result
      icon={<CloseCircleOutlined style={{ color: '#DC2626' }} />}
      title={status === 'no_token' ? 'No verification token' : 'Verification failed'}
      subTitle={error ?? 'No token was found in this link.'}
      extra={
        resendSent ? (
          <Text type="success">✓ A new link has been sent. Check your inbox.</Text>
        ) : (
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              Request a new verification link:
            </Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                type="email"
                placeholder="your@email.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <Button
                type="primary"
                loading={resendLoading}
                disabled={!resendEmail}
                onClick={handleResend}
              >
                Resend
              </Button>
            </Space.Compact>
          </div>
        )
      }
      style={{ padding: '1rem 0' }}
    >
      <Text type="secondary" style={{ fontSize: 14 }}>
        <Link href="/login" style={{ color: '#F59324' }}>Back to sign in</Link>
      </Text>
    </Result>
  );
}

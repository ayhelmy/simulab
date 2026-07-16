'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { login } from '@/lib/auth';
import type { ApiError } from '@/types/api';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface LoginFields { email: string; password: string }

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login: setAuthState } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = params.get('next') || '/dashboard';

  async function handleFinish(values: LoginFields) {
    setLoading(true);
    setServerError(null);
    try {
      const { accessToken, user } = await login({ email: values.email, password: values.password });
      setAuthState(user, accessToken);
      console.log('Login successful, redirecting to:', user);
      router.replace(next);
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.title || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>Welcome back</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Sign in to your Bedo SimuLearn account
      </Text>

      {serverError && (
        <Alert
          type="error"
          title={serverError}
          showIcon
          style={{ marginBottom: 20 }}
          closable
          onClose={() => setServerError(null)}
        />
      )}

      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          label="Email address"
          name="email"
          rules={[
            { required: true, message: 'Email is required.' },
            { type: 'email', message: 'Enter a valid email address.' },
          ]}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="you@university.edu"
            size="large"
            autoComplete="email"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          label={
            <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              Password
            </span>
          }
          name="password"
          rules={[{ required: true, message: 'Password is required.' }]}
          style={{ marginBottom: 20 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="••••••••"
            size="large"
            autoComplete="current-password"
          />
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 400 }}>
            Forgot password?
          </Link>
        </div>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
          style={{ marginTop: 4 }}
        >
          Sign in
        </Button>
      </Form>

      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 14 }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ fontWeight: 600 }}>Create account</Link>
      </Text>
    </>
  );
}

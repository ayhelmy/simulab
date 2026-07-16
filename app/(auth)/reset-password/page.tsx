'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/auth';
import type { ApiError } from '@/types/api';
import { Form, Input, Button, Alert, Typography, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ResetFields { password: string; confirmPassword: string }

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get('token');

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  async function handleFinish(values: ResetFields) {
    if (!token) { setServerError('Missing reset token. Please use the link from your email.'); return; }

    setLoading(true);
    setServerError(null);
    try {
      await resetPassword(token, values.password);
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.title || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Result
        status="error"
        title="Invalid reset link"
        subTitle="Please request a new password reset."
        extra={
          <Link href="/forgot-password">
            <Button type="primary">Request new link</Button>
          </Link>
        }
        style={{ padding: '1rem 0' }}
      />
    );
  }

  if (success) {
    return (
      <Result
        icon={<CheckCircleOutlined style={{ color: '#059669' }} />}
        title="Password updated!"
        subTitle="Your password has been reset. Redirecting to sign in…"
        style={{ padding: '1rem 0' }}
      />
    );
  }

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>Set new password</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Choose a strong password for your account.
      </Text>

      {serverError && (
        <Alert
          type="error"
          title={
            <>
              {serverError}{' '}
              {serverError.includes('expired') && (
                <Link href="/forgot-password" style={{ fontWeight: 600 }}>
                  Request a new link →
                </Link>
              )}
            </>
          }
          showIcon
          style={{ marginBottom: 20 }}
          closable
          onClose={() => setServerError(null)}
        />
      )}

      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item
          label="New password"
          name="password"
          rules={[
            { required: true, message: 'Password is required.' },
            { min: 8, message: 'Password must be at least 8 characters.' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (!/[A-Z]/.test(value)) return Promise.reject('Must contain at least one uppercase letter.');
                if (!/[0-9]/.test(value)) return Promise.reject('Must contain at least one number.');
                return Promise.resolve();
              },
            },
          ]}
          extra="At least 8 characters with an uppercase letter and a number."
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="••••••••"
            size="large"
            autoComplete="new-password"
            autoFocus
          />
        </Form.Item>

        <Form.Item
          label="Confirm new password"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject('Passwords do not match.');
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#9CA3AF' }} />}
            placeholder="••••••••"
            size="large"
            autoComplete="new-password"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ marginTop: 4 }}>
          Reset password
        </Button>
      </Form>
    </>
  );
}

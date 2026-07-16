'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/auth';
import type { ApiError } from '@/types/api';
import { Form, Input, Button, Alert, Typography, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  async function handleFinish({ email }: { email: string }) {
    setLoading(true);
    setServerError(null);
    try {
      await forgotPassword(email);
      setSentEmail(email);
      setSent(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.title || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Result
        icon={<span style={{ fontSize: 48 }}>📧</span>}
        title="Check your inbox"
        subTitle={
          <>
            If <strong>{sentEmail}</strong> is registered, we&apos;ve sent a password reset link.
            The link will expire in 1 hour.
          </>
        }
        extra={
          <Link href="/login">
            <Button size="large" block>Back to sign in</Button>
          </Link>
        }
        style={{ padding: '1rem 0' }}
      />
    );
  }

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>Reset your password</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Enter your email and we&apos;ll send you a reset link.
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

        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Send reset link
        </Button>
      </Form>

      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 14 }}>
        Remember your password?{' '}
        <Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
      </Text>
    </>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { register } from '@/lib/auth';
import type { ApiError } from '@/types/api';
import { Form, Input, Button, Alert, Typography, Row, Col, Result } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface RegisterFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  async function handleFinish(values: RegisterFields) {
    setLoading(true);
    setServerError(null);
    try {
      await register({
        email:     values.email,
        password:  values.password,
        firstName: values.firstName.trim(),
        lastName:  values.lastName.trim(),
      });
      setRegisteredEmail(values.email);
      setSuccess(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.title || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Result
        icon={<span style={{ fontSize: 48 }}>📧</span>}
        title="Check your inbox"
        subTitle={
          <>
            We sent a verification link to <strong>{registeredEmail}</strong>.
            Click the link to activate your account.
          </>
        }
        extra={
          <Text type="secondary" style={{ fontSize: 13 }}>
            Didn&apos;t receive it?{' '}
            <Link href="/login" style={{ color: '#F59324' }}>Go to login</Link>
          </Text>
        }
        style={{ padding: '1rem 0' }}
      />
    );
  }

  return (
    <>
      <Title level={3} style={{ marginBottom: 4 }}>Create your account</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Join Bedo SimuLearn to start your simulation-based learning journey
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
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="First name"
              name="firstName"
              rules={[{ required: true, message: 'First name is required.' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="Jane"
                autoComplete="given-name"
                autoFocus
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Last name"
              name="lastName"
              rules={[{ required: true, message: 'Last name is required.' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
                placeholder="Smith"
                autoComplete="family-name"
              />
            </Form.Item>
          </Col>
        </Row>

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
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item
          label="Password"
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
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          label="Confirm password"
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
            autoComplete="new-password"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
          style={{ marginTop: 4 }}
        >
          Create account
        </Button>
      </Form>

      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 14 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
      </Text>
    </>
  );
}

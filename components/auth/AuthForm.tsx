'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Form, Checkbox, Alert } from 'antd';
import { useAuth } from '@/context/AuthContext';
import { login } from '@/lib/auth';
import type { ApiError } from '@/types/api';
import { colors } from '@/components/home/homeTheme';
import InputField from './InputField';
import PasswordInput from './PasswordInput';
import LoginButton from './LoginButton';

interface LoginFields { email: string; password: string; remember?: boolean }

export default function AuthForm() {
  const { login: setAuthState } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFinish(values: LoginFields) {
    setLoading(true);
    setServerError(null);
    try {
      const { accessToken, user } = await login({ email: values.email, password: values.password });
      setAuthState(user, accessToken);
      // Don't navigate here — useGuestOnly redirects to `next` once `user` is
      // committed to context. Navigating synchronously races the destination
      // layout's own guard, which can still see user=null and bounce to /login.
    } catch (err) {
      const apiErr = err as ApiError;
      setServerError(apiErr.title || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span
        style={{
          display: 'inline-block', background: '#FEF3E2', color: colors.primary,
          fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          borderRadius: 999, padding: '5px 14px', marginBottom: 20,
        }}
      >
        Account Access
      </span>

      <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.25, color: '#1F2937', margin: '0 0 12px' }}>
        Log in to BEDO Interactive 3D Simulation
      </h1>
      <p style={{ fontSize: 14.5, color: colors.body, margin: '0 0 28px' }}>
        Access simulations, demos, and institution resources.
      </p>

      {serverError && (
        <Alert
          type="error"
          message={serverError}
          showIcon
          style={{ marginBottom: 20 }}
          closable
          onClose={() => setServerError(null)}
        />
      )}

      <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <InputField
          name="email"
          label="Email address"
          placeholder="name@institution.edu"
          autoComplete="email"
          autoFocus
          rules={[
            { required: true, message: 'Email is required.' },
            { type: 'email', message: 'Enter a valid email address.' },
          ]}
        />

        <PasswordInput
          name="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          rules={[{ required: true, message: 'Password is required.' }]}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Form.Item name="remember" valuePropName="checked" noStyle initialValue={false}>
            <Checkbox>
              <span style={{ fontSize: 13.5, color: colors.body }}>Remember me</span>
            </Checkbox>
          </Form.Item>
          <Link href="/forgot-password" style={{ fontSize: 13.5, fontWeight: 600, color: colors.primary }}>
            Forgot password?
          </Link>
        </div>

        <LoginButton loading={loading}>Log In</LoginButton>
      </Form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: colors.body }}>
        Need access?{' '}
        <Link href="/register" style={{ fontWeight: 700, color: colors.primary }}>Book a Demo</Link>
      </p>
    </div>
  );
}

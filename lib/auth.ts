/**
 * Auth API helpers — all auth-related API calls.
 * SRS §4.1 AUTH-01 – AUTH-08; §10.1 Auth API.
 * Access token lives in module memory (never localStorage).
 */

import { api, setAccessToken } from './api';
import type { User } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/** Attempt to restore a session using the HttpOnly refresh cookie. */
export async function silentRefresh(): Promise<AuthResponse | null> {
  try {
    const res = await api.post<AuthResponse>('/auth/refresh');
    setAccessToken(res.data.accessToken);
    return res.data;
  } catch {
    return null;
  }
}

/** Sign in with email + password. Returns tokens on success. */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', credentials);
  setAccessToken(res.data.accessToken);
  return res.data;
}

/** Create a new account. Server will send a verification email. */
export async function register(data: RegisterData): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/auth/register', data);
  return res.data ?? { message: res.message };
}

/** Verify email address with the token from the verification link. */
export async function verifyEmail(token: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/verify-email', { token });
  setAccessToken(res.data.accessToken);
  return res.data;
}

/** Send a password-reset email. Always returns success (server never reveals existence). */
export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

/** Set a new password using the reset token from the email link. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password });
}

/** Request a new verification email for the given address. */
export async function resendVerification(email: string): Promise<void> {
  await api.post('/auth/resend-verification', { email });
}

/** Sign out: invalidates the refresh token on server and clears in-memory access token. */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

/** Fetch the full current user profile (roles + permissions). */
export async function getMe(): Promise<User> {
  const res = await api.get<User>('/auth/me');
  return res.data;
}

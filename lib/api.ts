/**
 * Centralized API client.
 * SRS §10 API Requirements — JSON request/response, RFC 7807 errors.
 * Access token lives in module memory (not localStorage) — SRS §4.1 JWT strategy.
 */

import type { ApiSuccess, ApiError } from '@/types/api';
import { API_BASE_URL } from './constants';

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { method = 'GET', body, params, headers = {} } = options;

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null) qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',   // send HttpOnly refresh cookie automatically
  };

  if (body != null) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ type: 'about:blank', title: res.statusText, status: res.status }));
    throw err;
  }

  if (res.status === 204) {
    return { success: true, message: 'No content', data: null as unknown as T };
  }

  return res.json() as Promise<ApiSuccess<T>>;
}

export const api = {
  get:    <T>(path: string, params?: Record<string, unknown>) => request<T>(path, { params }),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put:    <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

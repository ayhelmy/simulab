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

// ── Access-token refresh ──────────────────────────────────────────────────────
// The access token is short-lived and only restored on page load (AuthContext
// silentRefresh). Without this, every call fails with 401 once it expires
// until the user reloads. On a 401, authFetch refreshes once via the HttpOnly
// refresh cookie and replays the request.

// Auth endpoints never trigger a refresh-and-retry: a 401 from them is a real
// answer (bad credentials, expired refresh cookie), and retrying /auth/refresh
// would recurse.
const NO_REFRESH_RETRY = /\/auth\/(refresh|login|logout|register|verify-email|forgot-password|reset-password|resend-verification)(\?|$)/;

const sessionExpiredListeners = new Set<() => void>();

/** Subscribe to "refresh cookie rejected" — the session is over. Returns an unsubscribe. */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => { sessionExpiredListeners.delete(listener); };
}

// Single-flight: concurrent 401s share one refresh call. Matters if the backend
// rotates refresh tokens — parallel refreshes would invalidate each other.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        // Only a rejected refresh cookie ends the session; a 5xx or network
        // blip leaves the user signed in so the next call can try again.
        if (res.status === 401 || res.status === 403) {
          setAccessToken(null);
          sessionExpiredListeners.forEach((l) => l());
        }
        return null;
      }
      const json = (await res.json()) as ApiSuccess<{ accessToken?: string }>;
      const token = json.data?.accessToken ?? null;
      if (token) setAccessToken(token);
      return token;
    } catch {
      return null;
    }
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

/**
 * fetch() with the Bearer token attached, and one refresh-and-retry on 401.
 * Use for any backend call that can't go through `api` (FormData, blobs, …).
 * The body must be replayable (string, FormData, Blob — not a stream).
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { credentials: 'include', ...init, headers });
  };

  const tokenUsed = _accessToken;
  const res = await send(tokenUsed);

  if (res.status !== 401 || NO_REFRESH_RETRY.test(url)) return res;

  // A 401 with no token attached usually means the in-memory token was lost
  // while the refresh cookie is still valid (e.g. a protected call fired
  // before/without the session restore). Try the cookie once rather than
  // failing with "Missing or malformed Authorization header". Only reached on
  // a 401, so public pages hitting public endpoints never trigger a refresh.
  // Another request may already have refreshed while this one was in flight.
  const fresh = _accessToken && _accessToken !== tokenUsed ? _accessToken : await refreshAccessToken();
  return fresh ? send(fresh) : res;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  // DEV ONLY — falls back to mock data when the backend is unavailable (lib/devMockApi.ts).
  // The inline env check is compiled to `false` in production builds, so the mock module is never loaded.
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_MOCK_AUTH === 'true') {
    const { devMockRequest } = await import('./devMockApi');
    return devMockRequest<T>(options.method ?? 'GET', path, options.params, options.body, () => sendRequest<T>(path, options));
  }
  return sendRequest<T>(path, options);
}

async function sendRequest<T>(path: string, options: RequestOptions): Promise<ApiSuccess<T>> {
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

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include',   // send HttpOnly refresh cookie automatically
  };

  if (body != null) {
    init.body = JSON.stringify(body);
  }

  const res = await authFetch(url, init);

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ type: 'about:blank', title: res.statusText, status: res.status }));
    throw err;
  }

  if (res.status === 204) {
    return { success: true, message: 'No content', data: null as unknown as T };
  }

  return res.json() as Promise<ApiSuccess<T>>;
}

/** POST a multipart/form-data body (file uploads) — no Content-Type header,
 *  so the browser sets its own boundary. */
async function postForm<T>(path: string, form: FormData): Promise<ApiSuccess<T>> {
  const res = await authFetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ type: 'about:blank', title: res.statusText, status: res.status }));
    throw err;
  }
  return res.json() as Promise<ApiSuccess<T>>;
}

export const api = {
  get:      <T>(path: string, params?: Record<string, unknown>) => request<T>(path, { params }),
  post:     <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  postForm,
  patch:    <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put:      <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete:   <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

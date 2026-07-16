'use client';

/**
 * Auth context — user state, permissions, and auth actions.
 * SRS §4.1: on mount, attempts silent refresh to restore session from HttpOnly cookie.
 * §12: permissions[] loaded as part of the auth response.
 * Multi-tenant: super_admin can switch the active institution without re-authenticating.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@/types';
import { silentRefresh, logout as authLogout } from '@/lib/auth';
import { setAccessToken } from '@/lib/api';
import { getInstitution } from '@/lib/institutions';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Dot-notation permission codes from §12 matrix */
  permissions: string[];
  /** Shortcut — true when any role is super_admin */
  isSuperAdmin: boolean;
  /** User's own institution ID from JWT */
  institutionId: string | undefined;
  /** Name of the user's own institution (fetched once on login) */
  institutionName: string | undefined;
  /**
   * Active institution for data queries.  For non-super_admin users this
   * equals institutionId.  super_admin can call switchInstitution() to point
   * the UI at a different tenant without re-logging in.
   */
  activeInstitutionId: string | undefined;
  activeInstitutionName: string | undefined;
  /** Shortcut — first managed department ID (dept_manager only) */
  departmentId: string | undefined;
  login:  (user: User, accessToken: string) => void;
  logout: () => Promise<void>;
  /** Update user profile in context (e.g. after avatar/name change) */
  updateUser: (partial: Partial<User>) => void;
  /** super_admin only — point the UI at a different institution */
  switchInstitution: (instId: string, instName: string) => void;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                           = useState<User | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [institutionName, setInstitutionName]     = useState<string | undefined>(undefined);
  const [activeInstId, setActiveInstId]           = useState<string | undefined>(undefined);
  const [activeInstName, setActiveInstName]       = useState<string | undefined>(undefined);

  // Restore session from HttpOnly refresh cookie on mount
  useEffect(() => {
    silentRefresh().then((result) => {
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
      }
      setLoading(false);
    });
  }, []);

  // Fetch institution name whenever the user's own institutionId changes
  useEffect(() => {
    const id = user?.institutionId;
    if (!id) {
      setInstitutionName(undefined);
      setActiveInstId(undefined);
      setActiveInstName(undefined);
      return;
    }
    setActiveInstId(id);
    getInstitution(id)
      .then((inst) => {
        setInstitutionName(inst.name);
        setActiveInstName(inst.name);
      })
      .catch(() => {
        setInstitutionName(undefined);
        setActiveInstName(undefined);
      });
  }, [user?.institutionId]);

  const permissions     = user?.permissions ?? [];
  const isAuthenticated = !!user;
  const institutionId   = user?.institutionId;
  const departmentId    = user?.managedDepartments?.[0];
  const isSuperAdmin    = user?.roles.some((r) => r.name === 'super_admin') ?? false;

  const login = useCallback((u: User, token: string) => {
    setAccessToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      setAccessToken(null);
    }
    setUser(null);
    setInstitutionName(undefined);
    setActiveInstId(undefined);
    setActiveInstName(undefined);
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...partial } : null);
  }, []);

  const switchInstitution = useCallback((instId: string, instName: string) => {
    setActiveInstId(instId);
    setActiveInstName(instName);
  }, []);

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (...codes: string[]) => codes.some((c) => permissions.includes(c)),
    [permissions],
  );

  const hasRole = useCallback(
    (roleName: string) => user?.roles.some((r) => r.name === roleName) ?? false,
    [user],
  );

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated, permissions,
      isSuperAdmin,
      institutionId, institutionName,
      activeInstitutionId: activeInstId,
      activeInstitutionName: activeInstName,
      departmentId,
      login, logout, updateUser, switchInstitution,
      hasPermission, hasAnyPermission, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

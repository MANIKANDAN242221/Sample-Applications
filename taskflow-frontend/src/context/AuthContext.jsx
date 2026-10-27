import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { onSessionExpired } from '../api/httpClient';
import { tokenStore } from '../api/tokenStore';
import { AuthContext } from './authContextValue';

/**
 * status: 'loading' (restoring session) | 'authenticated' | 'anonymous'
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const setSession = useCallback((nextUser) => {
    setUser(nextUser);
    setStatus(nextUser ? 'authenticated' : 'anonymous');
  }, []);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let cancelled = false;
    authApi
      .restore()
      .then((u) => !cancelled && setSession(u))
      .catch(() => !cancelled && setSession(null));
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  // When a silent refresh fails mid-session, drop to the login screen.
  useEffect(() => {
    onSessionExpired(() => setSession(null));
  }, [setSession]);

  const value = useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      user,
      status,
      isAuthenticated: status === 'authenticated',
      hasPermission: (permission) => permissions.has(permission),
      hasAnyPermission: (...list) => list.some((p) => permissions.has(p)),

      login: async (credentials) => setSession(await authApi.login(credentials)),
      register: async (payload) => setSession(await authApi.register(payload)),
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setSession(null);
        }
      },
      logoutAll: async () => {
        try {
          await authApi.logoutAll();
        } finally {
          setSession(null);
        }
      },
      updateUser: (patch) => setUser((current) => (current ? { ...current, ...patch } : current)),
      /** Called after the server revoked all sessions (e.g. password change). */
      endSession: () => {
        tokenStore.clear();
        setSession(null);
      },
    };
  }, [user, status, setSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

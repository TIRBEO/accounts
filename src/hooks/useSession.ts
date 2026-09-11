import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, refreshSession, type CurrentUserData } from '../lib/api';

const configuredApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined);

const API_BASE_URL = configuredApiUrl?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.app');

const KEEPALIVE_MS = 10 * 60 * 1000; // 10 minutes

export interface SessionState {
  user: CurrentUserData | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearKeepalive = useCallback(() => {
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
  }, []);

  const startKeepalive = useCallback(() => {
    clearKeepalive();
    keepaliveRef.current = setInterval(() => {
      refreshSession().catch(() => {});
    }, KEEPALIVE_MS);
  }, [clearKeepalive]);

  const checkSession = useCallback(async () => {
    const result = await getCurrentUser();
    if (result.ok && result.data) {
      setState({ user: result.data, loading: false, isAuthenticated: true });
      startKeepalive();
    } else {
      setState({ user: null, loading: false, isAuthenticated: false });
      clearKeepalive();
    }
  }, [startKeepalive, clearKeepalive]);

  useEffect(() => {
    checkSession();
    return clearKeepalive;
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await checkSession();
  }, [checkSession]);

  const signOut = useCallback(async () => {
    clearKeepalive();
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    } finally {
      setState({ user: null, loading: false, isAuthenticated: false });
    }
  }, [clearKeepalive]);

  return { ...state, refresh, signOut };
}

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

const SYNC_CHANNEL = 'tirbeo:session';

function getSyncChannel(): BroadcastChannel | null {
  try {
    if (typeof BroadcastChannel !== 'undefined') return new BroadcastChannel(SYNC_CHANNEL);
  } catch {}
  return null;
}

function notifyTabs(type: 'login' | 'logout' | 'update', payload?: unknown) {
  try { localStorage.setItem('tirbeo_session', JSON.stringify({ type, ts: Date.now(), payload })); } catch {}
  try { getSyncChannel()?.postMessage({ type, ts: Date.now(), payload }); } catch {}
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    user: null,
    loading: true,
    isAuthenticated: false,
  });
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<BroadcastChannel | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

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
      const changed = lastUserIdRef.current !== result.data.id;
      lastUserIdRef.current = result.data.id;
      setState({ user: result.data, loading: false, isAuthenticated: true });
      startKeepalive();
      // Remember which user the shared session belongs to so other apps can
      // detect a stale bearer token minted for a previously signed-in account.
      try { localStorage.setItem('tirbeo:token-user', result.data.id); } catch {}
      if (changed) notifyTabs('login', { userId: result.data.id });
    } else {
      const wasAuth = lastUserIdRef.current !== null;
      lastUserIdRef.current = null;
      setState({ user: null, loading: false, isAuthenticated: false });
      clearKeepalive();
      if (wasAuth) notifyTabs('logout');
    }
  }, [startKeepalive, clearKeepalive]);

  useEffect(() => {
    checkSession();
    // same-origin tabs: BroadcastChannel + storage
    const bc = getSyncChannel();
    syncRef.current = bc;
    const onBc = (e: MessageEvent) => {
      if (e.data?.type === 'logout') {
        lastUserIdRef.current = null;
        setState({ user: null, loading: false, isAuthenticated: false });
        clearKeepalive();
      } else if (e.data?.type === 'login') {
        checkSession();
      }
    };
    bc?.addEventListener('message', onBc);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tirbeo_session') {
        try {
          const v = e.newValue ? JSON.parse(e.newValue) : null;
          if (v?.type === 'logout') {
            lastUserIdRef.current = null;
            setState({ user: null, loading: false, isAuthenticated: false });
            clearKeepalive();
          } else if (v?.type === 'login') {
            checkSession();
          }
        } catch { checkSession(); }
      }
    };
    window.addEventListener('storage', onStorage);

    // cross-subdomain tabs (accounts ↔ dashboard ↔ forms): cookie is shared
    // on api.tirbeo.app, but localStorage is not. Poll visibility + focus +
    // interval so a login/logout in another app is picked up within seconds.
    const onFocus = () => { if (document.visibilityState === 'visible') checkSession(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    // 5s poll for instant cross-app + localhost sync (different ports are different origins)
    const poll = setInterval(checkSession, 5000);

    return () => {
      clearKeepalive();
      clearInterval(poll);
      bc?.removeEventListener('message', onBc);
      bc?.close();
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkSession, clearKeepalive]);

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
      lastUserIdRef.current = null;
      setState({ user: null, loading: false, isAuthenticated: false });
      notifyTabs('logout');
    }
  }, [clearKeepalive]);

  return { ...state, refresh, signOut };
}

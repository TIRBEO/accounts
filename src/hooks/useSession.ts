import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, refreshSession, type CurrentUserData } from '../lib/api';

const configuredApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined);

const API_BASE_URL = configuredApiUrl?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.tirbeo.com');

const KEEPALIVE_MS = 10 * 60 * 1000; // 10 minutes — rotates the session before the 15-min access token expires
const CHECK_DEBOUNCE_MS = 1000; // focus + visibilitychange often fire together; coalesce them

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
  const lastCheckRef = useRef(0);

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

  const checkSession = useCallback(async (debounced = false) => {
    if (debounced) {
      const now = Date.now();
      if (now - lastCheckRef.current < CHECK_DEBOUNCE_MS) return;
      lastCheckRef.current = now;
    }
    const result = await getCurrentUser();
    if (result.ok && result.data) {
      const prev = lastUserIdRef.current;
      lastUserIdRef.current = result.data.id;
      setState({ user: result.data, loading: false, isAuthenticated: true });
      startKeepalive();
      // Remember which user the shared session belongs to so other apps can
      // detect a stale bearer token minted for a previously signed-in account.
      try { localStorage.setItem('tirbeo:token-user', result.data.id); } catch {}
      // Only broadcast when the signed-in user actually changed — previously
      // every tab broadcast a 'login' on page load, waking every other tab.
      if (prev !== null && prev !== result.data.id) notifyTabs('login', { userId: result.data.id });
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
        checkSession(true);
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
            checkSession(true);
          }
        } catch { checkSession(true); }
      }
    };
    window.addEventListener('storage', onStorage);

    // cross-subdomain tabs (accounts ↔ dashboard ↔ forms): the cookie is shared
    // on api.tirbeo.com, but localStorage is not — so re-probe when the user
    // returns to this tab. Event-driven instead of the old 5-second poll.
    // Also pauses the session keepalive while hidden: background tabs don't
    // need token rotation, and it saves wake-ups/battery on mobile.
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSession(true);
        if (lastUserIdRef.current) startKeepalive();
      } else {
        clearKeepalive();
      }
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);

    return () => {
      clearKeepalive();
      bc?.removeEventListener('message', onBc);
      bc?.close();
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkSession, clearKeepalive, startKeepalive]);

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
      // Drop every browser-side trace of the session, not just React state.
      try {
        localStorage.removeItem('tirbeo:token-user');
        localStorage.removeItem('tirbeo:security');
        localStorage.removeItem('tirbeo:last-active');
      } catch {}
      lastUserIdRef.current = null;
      setState({ user: null, loading: false, isAuthenticated: false });
      notifyTabs('logout');
      window.location.assign('/login');
    }
  }, [clearKeepalive]);

  return { ...state, refresh, signOut };
}

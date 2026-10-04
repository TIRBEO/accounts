import React, { useState, useEffect, useRef, useCallback, type ReactNode, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AuthCard = lazy(() => import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard })));
import { SessionGate } from './components/auth/SessionGate';
import { CallbackView } from './components/CallbackView';
import { TermsModal } from './components/TermsModal';
import { MagicLinkSentPage } from './components/auth/MagicLinkSentPage';
import { SecurityPage } from './components/auth/SecurityPage';
import { SplitLoader } from './components/SplitLoader';
import { RealtimeBanner } from './components/RealtimeBanner';
import { getCurrentUser, verifyMagicLink } from './lib/api';
import { getRedirectTarget, redirectBlockedToDashboard } from './lib/redirect';
import { subscribeToUser, disconnectRealtime } from './lib/realtime';

const isCallbackPath = () => window.location.pathname.startsWith('/callback');
const isMagicSentPath = () => window.location.pathname.startsWith('/magic-sent');
// The security section manages passkeys, which needs a live session — so it must
// not be one of the pages that bounces a signed-in visitor to the dashboard.
const isSecurityPath = () => window.location.pathname.startsWith('/security');
let bootRan = false;
export type ToastType = 'success' | 'error' | 'info';
const inferToastType = (msg: string): ToastType => {
  const m = msg.toLowerCase();
  if (/(error|invalid|failed|expire|unable|wrong|too many|already exists|already registered|could not|couldn.t|not configured|try again|no account)/.test(m)) return 'error';
  if (/(success|signed in|sent to|verified|created|updated|welcome|resent|check your email|logged in)/.test(m)) return 'success';
  return 'info';
};
const TOAST_ICON: Record<ToastType, ReactNode> = { success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };

/**
 * Tirbeo Accounts — minimal dark shell.
 * Branding lives in AuthShell's centered wordmark; no top bar.
 */

/** 'checking' → auth probe in flight · 'guest' → show auth UI · 'redirecting' → signed in, navigating away */
type AuthState = 'checking' | 'guest' | 'redirecting';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    // Routes that manage their own auth state start as 'guest' so the boot
    // loader never sits on top of them.
    isCallbackPath() || isMagicSentPath() || isSecurityPath() ? 'guest' : 'checking',
  );
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const authStateRef = useRef<AuthState>(authState);
  useEffect(() => { authStateRef.current = authState; }, [authState]);

  const showToast = useCallback((msg: string, type?: ToastType) => {
    setToast({ msg, type: type || inferToastType(msg) });
    setTimeout(() => setToast((c) => (c?.msg === msg ? null : c)), 3200);
  }, []);

  const notifyTabs = useCallback((type: 'login' | 'logout') => {
    try { localStorage.setItem('tirbeo_session', JSON.stringify({ type, ts: Date.now() })); } catch {}
    try { new BroadcastChannel('tirbeo:session').postMessage({ type, ts: Date.now() }); } catch {}
  }, []);

  // ── Route-change loader (split screen) ──
  const [pageChanging, setPageChanging] = useState(false);
  /* No artificial delay on entry. This used to hold a 700ms split-screen on
     /magic-sent and /callback, so the screen that exists purely to say "we sent
     it" showed a loading animation first — on a phone, half a second of
     nothing before any content. The callback route genuinely waits on the token
     exchange, but that wait belongs to the page, not to a loader laid over it. */
  const [initialSplit] = useState(false);
  const pathRef = useRef(typeof window !== 'undefined' ? window.location.pathname : '/');
  useEffect(() => {
    // Wrap history mutations to detect SPA navigations instantly — no polling.
    const trigger = () => {
      if (window.location.pathname !== pathRef.current) {
        pathRef.current = window.location.pathname;
        setPageChanging(true);
        setTimeout(() => setPageChanging(false), 500);
      }
    };
    window.addEventListener('popstate', trigger);
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    (history as any).pushState = (...a: any[]) => { (origPush as any)(...a); trigger(); };
    (history as any).replaceState = (...a: any[]) => { (origReplace as any)(...a); trigger(); };
    return () => {
      window.removeEventListener('popstate', trigger);
      (history as any).pushState = origPush;
      (history as any).replaceState = origReplace;
    };
  }, []);

  const showLoader = authState !== 'guest' || pageChanging || initialSplit;

  // ── Boot: magic-link exchange + session probe (runs once) ──
  // Module-level guard: StrictMode's second effect pass must not re-read the
  // URL (magic_token is stripped by the first pass) nor cancel its in-flight
  // exchange — otherwise /login?magic_token= never signs in during dev.
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath() || isSecurityPath()) return;
    if (bootRan) return;
    bootRan = true;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = getRedirectTarget();
      const magicToken = params.get('magic_token');
      if (isSecurityPath()) {
      setAuthState('guest');
      return;
    }
    if (magicToken) {
        window.history.replaceState({}, '', window.location.pathname);
        const result = await verifyMagicLink(magicToken);
        if (result.block) { redirectBlockedToDashboard(result.block); return; }
        if (result.ok) {
          setAuthState('redirecting');
          showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`);
          notifyTabs('login');
          setTimeout(() => { window.location.href = redirectTarget; }, 800);
          return;
        }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.block) { redirectBlockedToDashboard(session.block); return; }
      if (session.ok && session.data) {
        lastIdRef.current = session.data.id;
        setUserId(session.data.id);
        setAuthState('redirecting');
        window.location.href = redirectTarget;
        return;
      }
      setAuthState('guest');
    };
    init();
  }, [showToast, notifyTabs]);

  // ── Cross-tab / cross-app session sync ──
  // Event-driven only: BroadcastChannel + storage events cover same-origin tabs;
  // visibilitychange/focus re-probes the shared cookie session when the user
  // returns to the tab (covers logins made in dashboard/forms subdomains).
  // The previous 5-second polling loop burned battery and caused reload loops.
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath()) return;
    let lastCheck = 0;
    const checkOnce = (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheck < 1000) return; // debounce focus+visibility firing together
      lastCheck = now;
      getCurrentUser().then((s) => {
        if (s.block) { redirectBlockedToDashboard(s.block); return; }
        const authed = !!s.ok && !!s.data;
        const newId = s.data?.id || null;
        if (authed && newId !== lastIdRef.current) {
          lastIdRef.current = newId;
          if (authStateRef.current !== 'redirecting') {
            setAuthState('redirecting');
            window.location.href = getRedirectTarget();
          }
        } else if (!authed && lastIdRef.current) {
          // Signed out elsewhere — drop back to the auth form without a reload.
          lastIdRef.current = null;
          if (authStateRef.current !== 'guest') setAuthState('guest');
        }
      }).catch(() => {});
    };
    const onLogout = () => {
      lastIdRef.current = null;
      setAuthState('guest');
      window.location.reload();
    };
    const bc = (() => { try { return new BroadcastChannel('tirbeo:session'); } catch { return null; } })();
    const onBc = (e: MessageEvent) => {
      if (e.data?.type === 'login') checkOnce(true);
      else if (e.data?.type === 'logout') onLogout();
    };
    bc?.addEventListener('message', onBc);
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'tirbeo_session') return;
      try {
        const v = e.newValue ? JSON.parse(e.newValue) : null;
        if (v?.type === 'logout') { onLogout(); return; }
        if (v?.type === 'login') checkOnce(true);
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === 'visible') checkOnce(); };
    bc && window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      bc?.removeEventListener('message', onBc);
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  const handleSuccessAuth = useCallback((email: string, provider: string) => {
    showToast(provider === 'Email Registration' ? 'Account created — welcome to Tirbeo' : `Signed in as ${email}`);
    notifyTabs('login');
    setAuthState('redirecting');
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 600);
  }, [showToast, notifyTabs]);

  // ── Realtime (Pusher Channels) ──
  // When a session id is known, subscribe to the user's private channel so
  // server-driven events (session revoked elsewhere, notifications) arrive
  // instantly. pusher-js is lazy-loaded — zero cost on the critical path.
  useEffect(() => {
    if (!userId) return;
    let cleanup: (() => void) | null = null;
    let disposed = false;
    subscribeToUser(userId, (data) => {
      // Event contract (apps/api/lib/notifications.ts createNotification):
      //   'notification' → { id, type, title, body?, message?, link? }
      //   'session'      → { type: 'session_revoked' }
      const ev = data as {
        type?: string;
        message?: string;
        title?: string;
        body?: string | null;
      } | null;
      if (ev?.type === 'session_revoked') {
        window.location.reload();
        return;
      }
      // createNotification sends title/body; legacy/pusherToastUser sends message.
      const text = ev?.message || (ev?.title ? (ev?.body ? `${ev.title} — ${ev.body}` : ev.title) : '');
      if (text) showToast(text);
    }).then((unsub) => {
      if (disposed && unsub) unsub();
      else cleanup = unsub;
    });
    return () => {
      disposed = true;
      cleanup?.();
      disconnectRealtime();
    };
  }, [userId, showToast]);

  const toastNode = (
    <div role="region" aria-label="Notifications" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.msg}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={`tb-toast tb-toast--${toast.type}`}
            role="status"
          >
            <span aria-hidden="true">{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const page = (content: ReactNode) => (
    <div className="relative min-h-dvh bg-bg">
      <div aria-hidden="true" className="sf-bg" />
      <RealtimeBanner />
      <SplitLoader active={showLoader} />
      <main id="main-content" className="relative z-10 min-h-dvh">
        {content}
      </main>
      <TermsModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
      {toastNode}
    </div>
  );

  // Wrap in MotionConfig so every animation respects prefers-reduced-motion.
  return (
    <MotionConfig reducedMotion="user">
      {isCallbackPath()
        ? page(<CallbackView onToast={showToast} />)
        : isMagicSentPath()
          ? page(<MagicLinkSentPage />)
          : isSecurityPath()
            ? page(<SecurityPage onShowToast={showToast} />)
            : page(
              <SessionGate onShowToast={showToast}>
                <Suspense fallback={null}>
                  <AuthCard key="authcard" onSuccessAuth={handleSuccessAuth} onOpenLegalModal={(t) => setModalType(t)} onShowToast={showToast} />
                </Suspense>
              </SessionGate>,
            )}
    </MotionConfig>
  );
}

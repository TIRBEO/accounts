import React, { useState, useEffect, useRef, useCallback, type ReactNode, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AuthCard = lazy(() => import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard })));
import { SessionGate } from './components/auth/SessionGate';
import { CallbackView } from './components/CallbackView';
import { TermsModal } from './components/TermsModal';
import { MagicLinkSentPage } from './components/auth/MagicLinkSentPage';
import { SplitLoader } from './components/SplitLoader';
import { RealtimeBanner } from './components/RealtimeBanner';
import { getCurrentUser, verifyMagicLink } from './lib/api';
import { getRedirectTarget, redirectBlockedToDashboard } from './lib/redirect';
import { subscribeToUser, disconnectRealtime } from './lib/realtime';

const isCallbackPath = () => window.location.pathname.startsWith('/callback');
const isMagicSentPath = () => window.location.pathname.startsWith('/magic-sent');
export type ToastType = 'success' | 'error' | 'info';
const inferToastType = (msg: string): ToastType => {
  const m = msg.toLowerCase();
  if (/(error|invalid|failed|expire|unable|wrong|too many|already exists|already registered|could not|couldn.t|not configured|try again|no account)/.test(m)) return 'error';
  if (/(success|signed in|sent to|verified|created|updated|welcome|resent|check your email|logged in)/.test(m)) return 'success';
  return 'info';
};
const TOAST_ICON: Record<ToastType, ReactNode> = { success: <CheckCircle2 size={18} />, error: <AlertCircle size={18} />, info: <Info size={18} /> };

/**
 * Background — one responsive image per device class via <picture>.
 * The browser downloads ONLY the variant matching the viewport
 * (desktop 84KB / tablet 80KB / mobile 60KB WebP) and re-evaluates the
 * media queries on resize. Previously all three 1.6–1.8MB PNGs were
 * downloaded on every device, which was the single biggest load-time cost.
 */
function Bg() {
  return (
    <>
      <picture style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'block' }} aria-hidden="true">
        <source media="(min-width: 1024px)" srcSet="/background.webp" />
        <source media="(min-width: 641px) and (max-width: 1023px)" srcSet="/background-tab.webp" />
        <source media="(max-width: 640px)" srcSet="/background-mobile.webp" />
        <img
          src="/background-mobile.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', userSelect: 'none', pointerEvents: 'none' }}
        />
      </picture>
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.52) 100%)' }} />
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(900px 600px at 50% 0%, rgba(0,149,246,0.10), transparent 70%)' }} />
    </>
  );
}

// Notifications moved to the dashboard app: the bell + web-push opt-in live
// there (persistent session, settings page). Accounts stays a lean auth
// surface — realtime (session revoked / notification toasts) still works via
// Pusher Channels, but there is no push-registration UI here.
function TopBar() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: typeof window !== 'undefined' && window.innerWidth <= 640 ? '12px 17px' : '19px 29px', background: 'transparent', border: 'none', minHeight: '67px' }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <img
          src="/logo-opt.png"
          alt=""
          width={432}
          height={288}
          decoding="async"
          style={{ height: typeof window !== 'undefined' && window.innerWidth <= 640 ? '34px' : '43px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
        />
        <span style={{ fontSize: typeof window !== 'undefined' && window.innerWidth <= 640 ? '22px' : '26px', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.55)' }} aria-hidden="false">Tirbeo</span>
      </a>
      <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>Accounts</span>
    </nav>
  );
}

/** 'checking' → auth probe in flight · 'guest' → show auth UI · 'redirecting' → signed in, navigating away */
type AuthState = 'checking' | 'guest' | 'redirecting';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    isCallbackPath() || isMagicSentPath() ? 'guest' : 'checking',
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
    try { new BroadcastChannel('tirbeo:session')?.postMessage({ type, ts: Date.now() }); } catch {}
  }, []);

  // ── Route-change loader (split screen) ──
  const [pageChanging, setPageChanging] = useState(false);
  const [initialSplit, setInitialSplit] = useState(() =>
    typeof window !== 'undefined' && (isCallbackPath() || isMagicSentPath()),
  );
  const pathRef = useRef(typeof window !== 'undefined' ? window.location.pathname : '/');
  useEffect(() => {
    if (initialSplit) {
      const t = setTimeout(() => setInitialSplit(false), 700);
      return () => clearTimeout(t);
    }
  }, [initialSplit]);
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
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath()) return;
    let cancelled = false;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = getRedirectTarget();
      const magicToken = params.get('magic_token');
      if (magicToken) {
        window.history.replaceState({}, '', window.location.pathname);
        const result = await verifyMagicLink(magicToken);
        if (cancelled) return;
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
      if (cancelled) return;
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
    return () => { cancelled = true; };
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
          <motion.div key={toast.msg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="tb-toast" role="status">
            <span aria-hidden="true">{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const page = (content: ReactNode, maxWidth: string, topPad: string) => (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Bg /><TopBar />
      <RealtimeBanner />
      <SplitLoader active={showLoader} />
      <main id="main-content" className="app-page-pad" style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: topPad, minHeight: 0, overflowY: 'hidden', overflowX: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: 'min(' + maxWidth + ', 100vw - 32px)', height: 'auto' }}>{content}</div>
      </main>
      <TermsModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
      {toastNode}
    </div>
  );

  const topPad = typeof window !== 'undefined' && window.innerWidth <= 640 ? '77px 14px 24px' : '86px 22px 29px';
  const callbackMaxWidth = typeof window !== 'undefined' && window.innerWidth <= 640 ? '760px' : '760px';

  // Wrap in MotionConfig so every animation respects prefers-reduced-motion.
  return (
    <MotionConfig reducedMotion="user">
      {isCallbackPath()
        ? page(<CallbackView onToast={showToast} />, callbackMaxWidth, topPad)
        : isMagicSentPath()
          ? page(<MagicLinkSentPage />, callbackMaxWidth, topPad)
          : page(
              <SessionGate>
                <Suspense fallback={null}>
                  <AuthCard key="authcard" onSuccessAuth={handleSuccessAuth} onOpenLegalModal={(t) => setModalType(t)} onShowToast={showToast} />
                </Suspense>
              </SessionGate>,
              '600px',
              topPad,
            )}
    </MotionConfig>
  );
}

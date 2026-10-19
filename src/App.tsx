import React, { useState, useEffect, useRef, useCallback, type ReactNode, lazy, Suspense } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AuthCard = lazy(() => import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard })));
import { SessionGate } from './components/auth/SessionGate';
import { AuthCardSkeleton } from './components/ui/ig-ui';
import { CallbackView } from './components/CallbackView';
import { MagicLinkSentPage } from './components/auth/MagicLinkSentPage';
import { SplitLoader } from './components/SplitLoader';
import { RealtimeBanner } from './components/RealtimeBanner';
import { SiteFooter, SiteHeader } from './components/AppChrome';
import { getCurrentUser, verifyMagicLink, apiPost } from './lib/api';
import { getRedirectTarget, goBlocked } from './lib/redirect';
import { subscribeToUser, disconnectRealtime } from './lib/realtime';
import { broadcastSession, clearSessionTrace, parseSessionMessage } from './lib/sessionSync';

const isCallbackPath = () => window.location.pathname.startsWith('/callback');
const isMagicSentPath = () => window.location.pathname.startsWith('/magic-sent');

/* ── "Already have an account? sign in and link" handoff ──
   The dashboard's OAuth create-screen sends people here with link_token when
   the provider email/identity already belongs to an account. Whatever login
   path finishes (password, OTP, magic link, passkey, or an already-live
   session), the token gets attached exactly once before navigating away. */
let linkTokenAtBoot: string | null | undefined;
function takeLinkToken(): string | null {
  if (linkTokenAtBoot !== undefined) return linkTokenAtBoot;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('link_token');
  linkTokenAtBoot = token || null;
  if (token) {
    params.delete('link_token');
    const q = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`);
  }
  return linkTokenAtBoot;
}
let linkAttachInFlight: Promise<string | null> | null = null;
async function attachLinkToken(showToast: (msg: string, type?: 'success' | 'error' | 'info') => void): Promise<string | null> {
  const token = takeLinkToken();
  if (!token) return null;
  if (!linkAttachInFlight) {
    linkAttachInFlight = apiPost<{ ok?: boolean; redirect_to?: string }>('/api/auth/oauth/attach', { token })
      .then((res) => {
        if (!res.ok) {
          showToast(res.error || 'Could not link that sign-in. You can connect it later from Connected apps.', 'error');
          return null;
        }
        showToast('Provider connected to your account', 'success');
        return res.data?.redirect_to || null;
      })
      .finally(() => { linkTokenAtBoot = null; });
  }
  return linkAttachInFlight;
}
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
 * Tirbeo Accounts — the tirbeo.com shell: sticky wordmark header, one centred
 * auth column, hairline footer. Same chrome and palette as the landing app.
 */

/** 'checking' → auth probe in flight · 'guest' → show auth UI · 'redirecting' → signed in, navigating away */
type AuthState = 'checking' | 'guest' | 'redirecting';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    // Routes that manage their own auth state start as 'guest' so the boot
    // loader never sits on top of them.
    isCallbackPath() || isMagicSentPath() ? 'guest' : 'checking',
  );
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const authStateRef = useRef<AuthState>(authState);
  useEffect(() => { authStateRef.current = authState; }, [authState]);

  const showToast = useCallback((msg: string, type?: ToastType) => {
    setToast({ msg, type: type || inferToastType(msg) });
    setTimeout(() => setToast((c) => (c?.msg === msg ? null : c)), 3200);
  }, []);

  // ── Route-change loader (split screen) ──
  const [pageChanging, setPageChanging] = useState(false);
  /* The pathname as state — the view switch below must re-render on SPA
     navigations. Reading window.location during render only updates when
     something else happens to repaint, which made routes stick. */
  const [routePath, setRoutePath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
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
        const prev = pathRef.current;
        pathRef.current = window.location.pathname;
        setRoutePath(pathRef.current);
        // The auth screens share one mounted app and need no data — flashing
        // the full-screen loader over them reads as a black page.
        const authSpa = (p: string) => p.startsWith('/magic-sent') || p === '/login' || p === '/signup' || p === '/';
        if (authSpa(pathRef.current) && authSpa(prev)) return;
        setPageChanging(true);
        setTimeout(() => setPageChanging(false), 300);
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
    if (isCallbackPath() || isMagicSentPath()) return;
    if (bootRan) return;
    bootRan = true;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = getRedirectTarget();
      const magicToken = params.get('magic_token');
      if (magicToken) {
        window.history.replaceState({}, '', window.location.pathname);
        const result = await verifyMagicLink(magicToken);
        if (result.block) { goBlocked(); return; }
        if (result.ok) {
          setAuthState('redirecting');
          showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`);
          broadcastSession('login');
          const linked = await attachLinkToken(showToast);
          setTimeout(() => { window.location.href = linked || redirectTarget; }, 800);
          return;
        }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.block) { goBlocked(); return; }
      if (session.ok && session.data) {
        lastIdRef.current = session.data.id;
        setUserId(session.data.id);
        setAuthState('redirecting');
        const linked = await attachLinkToken(showToast);
        window.location.href = linked || redirectTarget;
        return;
      }
      setAuthState('guest');
    };
    init();
  }, [showToast]);

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
        if (s.block) { goBlocked(); return; }
        const authed = !!s.ok && !!s.data;
        const newId = s.data?.id || null;
        if (authed && newId !== lastIdRef.current) {
          lastIdRef.current = newId;
          if (authStateRef.current !== 'redirecting') {
            setAuthState('redirecting');
            attachLinkToken(showToast).then((linked) => { window.location.href = linked || getRedirectTarget(); });
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
      const ev = parseSessionMessage(e.data);
      if (ev?.type === 'login') checkOnce(true);
      else if (ev?.type === 'logout') onLogout();
    };
    bc?.addEventListener('message', onBc);
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'tirbeo_session') return;
      const ev = parseSessionMessage(e.newValue);
      if (ev?.type === 'logout') { onLogout(); return; }
      if (ev?.type === 'login') checkOnce(true);
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
    broadcastSession('login');
    setAuthState('redirecting');
    setTimeout(async () => {
      const linked = await attachLinkToken(showToast);
      window.location.href = linked || getRedirectTarget();
    }, 600);
  }, [showToast]);

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
    <div className="app-shell">
      <SiteHeader />
      <RealtimeBanner />
      <SplitLoader active={showLoader} />
      <main id="main-content" className="app-main">
        {content}
      </main>
      <SiteFooter />
      {toastNode}
    </div>
  );

  // Wrap in MotionConfig so every animation respects prefers-reduced-motion.
  return (
    <MotionConfig reducedMotion="user">
      {routePath.startsWith('/callback')
        ? page(<CallbackView onToast={showToast} />)
        : routePath.startsWith('/magic-sent')
          ? page(<MagicLinkSentPage />)
          : page(
              <SessionGate onShowToast={showToast}>
                <Suspense fallback={<AuthCardSkeleton />}>
                  <AuthCard key="authcard" onSuccessAuth={handleSuccessAuth} onShowToast={showToast} />
                </Suspense>
              </SessionGate>,
            )}
    </MotionConfig>
  );
}

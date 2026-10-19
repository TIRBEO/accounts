import React, { useState, useEffect, useRef, useCallback, type ReactNode, lazy, Suspense } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AuthCard = lazy(() => import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard })));
import { SessionGate } from './components/auth/SessionGate';
import { AuthCardSkeleton } from './components/ui/ig-ui';
import { CallbackView } from './components/CallbackView';
import { MagicLinkSentPage } from './components/auth/MagicLinkSentPage';
import { SplitLoader } from './components/SplitLoader';
import { RealtimeBanner } from './components/RealtimeBanner';
import { SiteFooter, SiteHeader } from './components/AppChrome';
import { verifyMagicLink, apiPost } from './lib/api';
import { getRedirectTarget, goBlocked, isAllowedRedirectTarget, requestedHandoff } from './lib/redirect';
import { announceSignIn, useSession } from './hooks/useSession';
import { subscribeToUser, disconnectRealtime } from './lib/realtime';

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

/** StrictMode mounts effects twice; a magic-link token is spent on the first pass. */
let magicRan = false;

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
 *
 * This component decides what to SHOW; it holds no opinion about who is signed
 * in. `useSession` is the only place that asks, so the probe cannot be run
 * twice with two different rules about what a dropped request means.
 */
export default function App() {
  const session = useSession();
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const userId = session.user?.id ?? null;

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

  // ── Magic link: exchange the token the email carried (runs once) ──
  // Module-level guard: StrictMode's second effect pass must not re-read the
  // URL (the token is stripped by the first pass) nor cancel its in-flight
  // exchange — otherwise /login?magic_token= never signs in during dev.
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath() || magicRan) return;
    magicRan = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('magic_token');
    if (!token) return;
    window.history.replaceState({}, '', window.location.pathname);
    const exchange = async () => {
      const result = await verifyMagicLink(token);
      if (result.block) { goBlocked(); return; }
      if (!result.ok) {
        showToast(result.error || 'This magic link is invalid or has expired.');
        return;
      }
      showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`, 'success');
      void announceSignIn();
      // The emailed link names its own destination, already allowlist-checked by
      // the API — that beats guessing from this page's query string.
      const fromLink = result.redirectTo && isAllowedRedirectTarget(result.redirectTo)
        ? result.redirectTo
        : getRedirectTarget();
      const linked = await attachLinkToken(showToast);
      setTimeout(() => { window.location.href = linked || fromLink; }, 800);
    };
    void exchange();
  }, [showToast]);

  // ── What the session answer means for this screen ──
  // A closed account goes to the settings gate, which reads the facts from the
  // API — nothing about the closure travels in the URL. A signed-in visitor is
  // handed off only when the URL *asked* for a destination; otherwise they stay
  // on this app's signed-in screen, which is where passkeys are managed. Bouncing
  // them to the dashboard because they came from the dashboard is a loop.
  const handedOffRef = useRef(false);
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath()) return;
    if (session.status === 'blocked') { goBlocked(); return; }
    if (session.status !== 'member') { handedOffRef.current = false; return; }
    if (handedOffRef.current) return;
    handedOffRef.current = true;
    const target = requestedHandoff();
    void attachLinkToken(showToast).then((linked) => {
      const destination = linked || target;
      if (destination) window.location.href = destination;
    });
  }, [session.status, showToast]);

  const handleSuccessAuth = useCallback((email: string, provider: string) => {
    showToast(provider === 'Email Registration' ? 'Account created — welcome to Tirbeo' : `Signed in as ${email}`, 'success');
    void announceSignIn();
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

  // The live region stays mounted whether or not a toast is showing: an
  // announcement inserted into a region that appears at the same time can be
  // missed by screen readers.
  const toastNode = (
    <div role="region" aria-label="Notifications" aria-live="polite" aria-atomic="true">
      {toast && (
        <div key={toast.msg} role="status" className={`tb-toast tb-toast--${toast.type}`}>
          <span aria-hidden="true">{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span>
        </div>
      )}
    </div>
  );

  const page = (content: ReactNode) => (
    <div className="app-shell">
      <SiteHeader />
      <RealtimeBanner />
      <SplitLoader active={pageChanging} />
      <main id="main-content" className="app-main">
        {content}
      </main>
      <SiteFooter />
      {toastNode}
    </div>
  );

  return (
    routePath.startsWith('/callback')
      ? page(<CallbackView onToast={showToast} />)
      : routePath.startsWith('/magic-sent')
        ? page(<MagicLinkSentPage />)
        : page(
            <SessionGate onShowToast={showToast}>
              <Suspense fallback={<AuthCardSkeleton />}>
                <AuthCard onSuccessAuth={handleSuccessAuth} onShowToast={showToast} />
              </Suspense>
            </SessionGate>,
          )
  );
}

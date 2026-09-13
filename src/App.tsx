import React, { useState, useEffect, useRef, type ReactNode, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AuthCard = lazy(() => import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard })));
import { SessionGate } from './components/auth/SessionGate';
import { CallbackView } from './components/CallbackView';
import { TermsModal } from './components/TermsModal';
import { MagicLinkSentPage } from './components/auth/MagicLinkSentPage';
import { SplitLoader } from './components/SplitLoader';
import { getCurrentUser, verifyMagicLink } from './lib/api';
import { getRedirectTarget, redirectBlockedToDashboard } from './lib/redirect';

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

function Bg() {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.52) 100%)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(900px 600px at 50% 0%, rgba(0,149,246,0.10), transparent 70%)' }} />
    </>
  );
}
function TopBar() {
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'transparent', border: 'none' }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <img src="/logo.png" alt="Tirbeo" style={{ height: '36px', width: 'auto', filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.45))' }} />
        <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>Tirbeo</span>
      </a>
      <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.01em', color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>Accounts</span>
    </nav>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(!isCallbackPath());
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const showToast = (msg: string, type?: ToastType) => { setToast({ msg, type: type || inferToastType(msg) }); setTimeout(() => setToast((c) => (c?.msg === msg ? null : c)), 3200); };
  const notifyTabs = (type: 'login' | 'logout') => {
    try { localStorage.setItem('tirbeo_session', JSON.stringify({ type, ts: Date.now() })); } catch {}
    try { new BroadcastChannel('tirbeo:session')?.postMessage({ type, ts: Date.now() }); } catch {}
  };
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
        if (result.ok) { setIsAuthenticated(true); showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`); notifyTabs('login'); setTimeout(() => { window.location.href = redirectTarget; }, 800); return; }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.block) { redirectBlockedToDashboard(session.block); return; }
      if (session.ok && session.data) { lastIdRef.current = session.data.id; setIsAuthenticated(true); window.location.href = redirectTarget; return; }
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (isCallbackPath() || isMagicSentPath()) return;
    const bc = (() => { try { return new BroadcastChannel('tirbeo:session'); } catch { return null; } })();
    const onBc = (e: MessageEvent) => {
      if (e.data?.type === 'login' && !isCallbackPath()) {
        setIsLoading(true);
        getCurrentUser().then((s) => {
          if (s.ok && s.data) {
            const newId = s.data.id;
            if (newId !== lastIdRef.current) { lastIdRef.current = newId; setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
            else if (!isAuthenticated) { setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
            else window.location.reload();
          } else setIsLoading(false);
        }).catch(() => setIsLoading(false));
      }
      if (e.data?.type === 'logout') { lastIdRef.current = null; setIsAuthenticated(false); setIsLoading(false); window.location.reload(); }
    };
    bc?.addEventListener('message', onBc);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tirbeo_session' && !isCallbackPath()) {
        try { const v = e.newValue ? JSON.parse(e.newValue) : null; if (v?.type === 'logout') { lastIdRef.current = null; setIsAuthenticated(false); setIsLoading(false); window.location.reload(); return; } } catch {}
        setIsLoading(true);
        getCurrentUser().then((session) => {
          if (session.ok && session.data) {
            const newId = session.data.id;
            if (newId !== lastIdRef.current) { lastIdRef.current = newId; setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
            else { setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
          } else { lastIdRef.current = null; setIsLoading(false); }
        }).catch(() => setIsLoading(false));
      }
    };
    window.addEventListener('storage', handleStorage);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !isCallbackPath()) {
        getCurrentUser().then((s) => {
          const authed = !!s.ok && !!s.data; const newId = s.data?.id || null;
          if (authed && newId !== lastIdRef.current) { lastIdRef.current = newId; setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
          else if (authed && !isAuthenticated) { setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
          else if (!authed && isAuthenticated) { lastIdRef.current = null; setIsAuthenticated(false); setIsLoading(false); window.location.reload(); }
          else if (!authed && lastIdRef.current && newId !== lastIdRef.current) window.location.reload();
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const poll = setInterval(() => {
      if (isCallbackPath()) return;
      getCurrentUser().then((s) => {
        const authed = !!s.ok && !!s.data; const newId = s.data?.id || null;
        if (newId !== lastIdRef.current) {
          if (authed) { lastIdRef.current = newId; setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
          else if (isAuthenticated || lastIdRef.current) { lastIdRef.current = null; setIsAuthenticated(false); setIsLoading(false); window.location.reload(); }
        } else if (authed !== isAuthenticated) {
          if (authed) { setIsAuthenticated(true); window.location.href = getRedirectTarget(); }
          else { lastIdRef.current = null; setIsAuthenticated(false); setIsLoading(false); }
        }
      }).catch(() => {});
    }, 5000);
    return () => { bc?.removeEventListener('message', onBc); bc?.close(); window.removeEventListener('storage', handleStorage); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); clearInterval(poll); };
  }, [isAuthenticated]);
  const handleSuccessAuth = async (email: string, provider: string) => {
    showToast(provider === 'Email Registration' ? 'Account created — welcome to Tirbeo' : `Signed in as ${email}`);
    notifyTabs('login');
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 600);
  };

  if (isCallbackPath()) {
    return (
      <div style={{ position: 'relative', minHeight: '100dvh', background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Bg /><TopBar />
        <SplitLoader active={showLoader} />
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '72px 16px 24px', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: '760px', height: 'auto' }}><CallbackView onToast={showToast} /></div>
        </div>
        <AnimatePresence>{toast && <motion.div key={toast.msg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="tb-toast"><span>{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span></motion.div>}</AnimatePresence>
      </div>
    );
  }
  if (isMagicSentPath()) {
    return (
      <div style={{ position: 'relative', minHeight: '100dvh', background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Bg /><TopBar />
        <SplitLoader active={showLoader} />
        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '72px 16px 24px', minHeight: 0 }}>
          <div style={{ width: '100%', maxWidth: '760px', height: 'auto' }}><MagicLinkSentPage /></div>
        </div>
        <AnimatePresence>{toast && <motion.div key={toast.msg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="tb-toast"><span>{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span></motion.div>}</AnimatePresence>
      </div>
    );
  }
  const [pageChanging, setPageChanging] = useState(false);
  const [initialSplit, setInitialSplit] = useState(() => (typeof window !== 'undefined' ? (window.location.pathname.startsWith('/callback') || window.location.pathname.startsWith('/magic-sent')) : false));
  const pathRef = useRef(typeof window !== 'undefined' ? window.location.pathname : '/');
  useEffect(() => {
    if (initialSplit) {
      const t = setTimeout(() => setInitialSplit(false), 700);
      return () => clearTimeout(t);
    }
  }, [initialSplit]);
  useEffect(() => {
    const trigger = () => {
      if (typeof window === 'undefined') return;
      if (window.location.pathname !== pathRef.current) {
        pathRef.current = window.location.pathname;
        setPageChanging(true);
        setTimeout(() => setPageChanging(false), 700);
      }
    };
    window.addEventListener('popstate', trigger);
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    (history as any).pushState = (...a: any[]) => { (origPush as any)(...a); trigger(); };
    (history as any).replaceState = (...a: any[]) => { (origReplace as any)(...a); trigger(); };
    const iv = setInterval(trigger, 300);
    return () => { window.removeEventListener('popstate', trigger); (history as any).pushState = origPush; (history as any).replaceState = origReplace; clearInterval(iv); };
  }, []);

  const showLoader = isLoading || isAuthenticated || pageChanging || initialSplit;

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Bg /><TopBar />
      <SplitLoader active={showLoader} />
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '72px 16px 20px', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: '980px', height: 'auto' }}>
          <SessionGate>
            <Suspense fallback={null}>
              <AuthCard key="authcard" onSuccessAuth={handleSuccessAuth} onOpenLegalModal={(t) => setModalType(t)} onShowToast={showToast} />
            </Suspense>
          </SessionGate>
        </div>
      </main>
      <TermsModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
      <AnimatePresence>{toast && <motion.div key={toast.msg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="tb-toast"><span>{TOAST_ICON[toast.type]}</span><span>{toast.msg}</span></motion.div>}</AnimatePresence>
    </div>
  );
}

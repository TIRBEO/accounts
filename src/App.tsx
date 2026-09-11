import { useState, useEffect, type ReactNode, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const AuthCard = lazy(() =>
  import('./components/auth/AuthCard').then((m) => ({ default: m.AuthCard }))
);
import { SessionGate } from './components/auth/SessionGate';
import { CallbackView } from './components/CallbackView';
import { TermsModal } from './components/TermsModal';
import { getCurrentUser, verifyMagicLink } from './lib/api';
import { getRedirectTarget, redirectBlockedToDashboard } from './lib/redirect';

const isCallbackPath = () => window.location.pathname.startsWith('/callback');

export type ToastType = 'success' | 'error' | 'info';

const inferToastType = (msg: string): ToastType => {
  const m = msg.toLowerCase();
  if (/(error|invalid|failed|expire|unable|wrong|too many|already exists|already registered|could not|couldn.t|not configured|try again|no account)/.test(m)) return 'error';
  if (/(success|signed in|sent to|verified|created|updated|welcome|resent|check your email|logged in)/.test(m)) return 'success';
  return 'info';
};

const TOAST_ICON: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(!isCallbackPath());
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

  const showToast = (msg: string, type?: ToastType) => {
    setToast({ msg, type: type || inferToastType(msg) });
    setTimeout(() => {
      setToast((current) => (current?.msg === msg ? null : current));
    }, 3000);
  };

  useEffect(() => {
    if (isCallbackPath()) return;

    let cancelled = false;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = getRedirectTarget();
      const magicToken = params.get('magic_token');
      if (magicToken) {
        window.history.replaceState({}, '', window.location.pathname);
        const result = await verifyMagicLink(magicToken);
        if (cancelled) return;
        if (result.block) {
          redirectBlockedToDashboard(result.block);
          return;
        }
        if (result.ok) {
          setIsAuthenticated(true);
          showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`);
          localStorage.setItem('tirbeo_session', Date.now().toString());
          setTimeout(() => { window.location.href = redirectTarget; }, 1000);
          return;
        }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.block) {
        redirectBlockedToDashboard(session.block);
        return;
      }
      if (session.ok && session.data) {
        setIsAuthenticated(true);
        window.location.href = redirectTarget;
      }
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Sync session across tabs: when another tab logs in/out, re-check
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tirbeo_session' && !isCallbackPath()) {
        setIsLoading(true);
        getCurrentUser().then((session) => {
          if (session.ok && session.data) {
            setIsAuthenticated(true);
            window.location.href = getRedirectTarget();
          } else {
            setIsLoading(false);
          }
        }).catch(() => setIsLoading(false));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Re-check session when tab becomes visible (covers cookie-only changes)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isCallbackPath() && !isAuthenticated) {
        getCurrentUser().then((session) => {
          if (session.ok && session.data) {
            setIsAuthenticated(true);
            window.location.href = getRedirectTarget();
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated]);

  const handleSuccessAuth = async (email: string, provider: string) => {
    const isSignup = provider === 'Email Registration';
    showToast(isSignup ? 'Account created successfully' : `Signed in as ${email}`);
    localStorage.setItem('tirbeo_session', Date.now().toString());
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 1000);
  };

  if (isCallbackPath()) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#000000', color: '#f5f5f5', overflow: 'hidden' }}>
        <CallbackView onToast={showToast} />
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.msg}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className={`tb-toast tb-toast--${toast.type}`}
            >
              {TOAST_ICON[toast.type]}
              <span>{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (isLoading || isAuthenticated) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', background: '#000000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
        >
          <img src="/logo.png" alt="Tirbeo" width={128} height={85} style={{ height: '52px', width: 'auto', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.3))' }} />
          <div style={{ position: 'relative', width: '112px', height: '6px', overflow: 'hidden', borderRadius: '999px', background: 'rgba(255,255,255,0.09)' }}>
            <motion.div
              style={{ position: 'absolute', top: 0, bottom: 0, width: '33%', borderRadius: '999px', background: '#0095f6' }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#484848' }}>
            {isAuthenticated ? 'Redirecting to dashboard' : 'Loading'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#000000', overflow: 'hidden' }}>
      {/* Background image */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />

      {/* Top navbar */}
      <nav className="auth-nav" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        padding: '18px 36px',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Tirbeo" className="auth-logo" height={44} style={{ height: '44px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
          <span className="auth-brand" style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Tirbeo</span>
        </a>
      </nav>

      {/* Auth content */}
      <div style={{ position: 'relative', zIndex: 10, paddingTop: '72px' }}>
        <SessionGate>
          <Suspense fallback={null}>
            <AuthCard
              key="authcard"
              onSuccessAuth={handleSuccessAuth}
              onOpenLegalModal={(type) => setModalType(type)}
              onShowToast={showToast}
            />
          </Suspense>
        </SessionGate>
      </div>

      <TermsModal
        isOpen={!!modalType}
        type={modalType}
        onClose={() => setModalType(null)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.msg}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`tb-toast tb-toast--${toast.type}`}
          >
            {TOAST_ICON[toast.type]}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

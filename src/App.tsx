import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { AuthCard } from './components/AuthCard';
import { CallbackView } from './components/CallbackView';
import { TermsModal } from './components/TermsModal';
import { HalftoneBackground } from './components/HalftoneBackground';
import { getCurrentUser, verifyMagicLink } from './lib/api';
import { preconnectOAuthProviders } from './lib/oauth';
import { getRedirectTarget } from './lib/redirect';

// `/callback` is where the API lands users after an OAuth provider round-trip
// (login or first-time signup). Everything else renders the auth card.
const isCallbackPath = () => window.location.pathname.startsWith('/callback');

export type ToastType = 'success' | 'error' | 'info';

/** Classify a message so every existing toast call gets the right color. */
const inferToastType = (msg: string): ToastType => {
  const m = msg.toLowerCase();
  if (/(error|invalid|failed|expire|unable|wrong|too many|already exists|already registered|could not|couldn.t|not configured|try again|no account)/.test(m)) return 'error';
  if (/(success|signed in|sent to|verified|created|updated|welcome|resent|check your email|logged in)/.test(m)) return 'success';
  return 'info';
};

const TOAST_ICON: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="wave-toast-icon w-[18px] h-[18px]" />,
  error: <AlertCircle className="wave-toast-icon w-[18px] h-[18px]" />,
  info: <Info className="wave-toast-icon w-[18px] h-[18px]" />,
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
    }, 3500);
  };

  useEffect(() => {
    // Warm TLS to every OAuth provider so social buttons hand off instantly.
    preconnectOAuthProviders();

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
        if (result.ok) {
          setIsAuthenticated(true);
          showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`);
          setTimeout(() => { window.location.href = redirectTarget; }, 1000);
          return;
        }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.ok && session.data) {
        setIsAuthenticated(true);
        window.location.href = redirectTarget;
      }
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const handleSuccessAuth = async (email: string, provider: string) => {
    showToast(`Signed in successfully as ${email}`);
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 1000);
  };

  // Callback route — OAuth post-login / new-user welcome.
  if (isCallbackPath()) {
    return (
      <div className="relative min-h-screen bg-[var(--wave-bg)] text-[var(--wave-text)] overflow-hidden">
        <HalftoneBackground />
        <CallbackView onToast={showToast} />
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.msg}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className={`wave-toast wave-toast--${toast.type}`}
            >
              {TOAST_ICON[toast.type]}
              <span>{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Loading state
  if (isLoading || isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[var(--wave-bg)] text-[var(--wave-text)] overflow-hidden flex items-center justify-center">
        <HalftoneBackground />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-5"
        >
          <img src="/logo.png" alt="Tirbeo" className="h-12 w-auto" />
          <span className="relative flex h-1.5 w-28 overflow-hidden rounded-full bg-[var(--wave-surface-container-highest)]">
            <motion.span
              className="absolute inset-y-0 w-1/3 rounded-full bg-[var(--wave-primary)]"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--wave-on-surface-variant)]">
            {isAuthenticated ? 'Redirecting to dashboard' : 'Loading'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--wave-bg)] text-[var(--wave-text)] overflow-hidden">
      <HalftoneBackground />

      <AnimatePresence mode="wait">
        <AuthCard
          key="authcard"
          onSuccessAuth={handleSuccessAuth}
          onOpenLegalModal={(type) => setModalType(type)}
          onShowToast={showToast}
        />
      </AnimatePresence>

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
            className={`wave-toast wave-toast--${toast.type}`}
          >
            {TOAST_ICON[toast.type]}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

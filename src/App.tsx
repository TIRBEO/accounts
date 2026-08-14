import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { HalftoneBackground } from './components/HalftoneBackground';
import { AuthCard } from './components/AuthCard';
import { TermsModal } from './components/TermsModal';
import { getCurrentUser, verifyMagicLink } from './lib/api';

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3005';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const magicToken = params.get('magic_token');
      if (magicToken) {
        window.history.replaceState({}, '', window.location.pathname);
        const result = await verifyMagicLink(magicToken);
        if (cancelled) return;
        if (result.ok) {
          setIsAuthenticated(true);
          showToast(`Signed in successfully${result.email ? ' as ' + result.email : ''}`);
          setTimeout(() => { window.location.href = DASHBOARD_URL; }, 1000);
          return;
        }
        showToast(result.error || 'This magic link is invalid or has expired.');
      }
      const session = await getCurrentUser();
      if (session.ok && session.data) {
        setIsAuthenticated(true);
        window.location.href = DASHBOARD_URL;
      }
      if (!cancelled) setIsLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const handleSuccessAuth = async (email: string, provider: string) => {
    showToast(`Signed in successfully as ${email}`);
    setTimeout(() => { window.location.href = DASHBOARD_URL; }, 1000);
  };

  // Loading state
  if (isLoading || isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#080809] text-[#F5F5F5] overflow-hidden flex items-center justify-center">
        <HalftoneBackground />
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center gap-4"
        >
          <img src="/logo.png" alt="Tirbeo" className="h-12 w-auto" />
          <Loader2 className="w-6 h-6 animate-spin text-[#F5F5F5]" />
          <p className="text-sm text-[#858589]">{isAuthenticated ? 'Redirecting to dashboard...' : 'Loading...'}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#080809] text-[#F5F5F5] overflow-hidden">
      <HalftoneBackground />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />

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
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="wave-toast"
          >
            <span className="w-2 h-2 rounded-full bg-[#F5F5F5]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

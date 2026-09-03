import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TermsModalProps {
  isOpen: boolean;
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, type, onClose }) => {
  if (!isOpen || !type) return null;

  const isTerms = type === 'terms';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-[var(--wave-surface-container-highest)] backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="wave-card w-full max-w-xl p-6 relative z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-[var(--wave-outline-variant)] mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-black border border-[var(--wave-outline-variant)] flex items-center justify-center shadow-lg shadow-[rgba(255,255,255,0.08)]">
                {isTerms ? <FileText className="w-5 h-5 text-[var(--wave-text)]" /> : <ShieldCheck className="w-5 h-5 text-[var(--wave-text)]" />}
              </div>
              <h3 className="text-lg font-bold text-[var(--wave-text)]">
                {isTerms ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--wave-on-surface-variant)] hover:text-[var(--wave-text)] hover:bg-[var(--wave-surface-container-low)] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2 text-[var(--wave-on-surface-variant)] leading-relaxed">
            {isTerms ? (
              <>
                <p>
                  Welcome to Tirbeo. By creating an account or accessing our platform, you agree to comply with and be bound by the following Terms of Service.
                </p>
                <h4 className="font-semibold text-[var(--wave-text)] text-base pt-3">1. Account Security</h4>
                <p>
                  You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. Notify us immediately of any unauthorized usage.
                </p>
                <h4 className="font-semibold text-[var(--wave-text)] text-base pt-3">2. Usage Rights</h4>
                <p>
                  Tirbeo grants you a limited, non-exclusive, non-transferable license to access and use our web services in accordance with these terms.
                </p>
                <h4 className="font-semibold text-[var(--wave-text)] text-base pt-3">3. Termination</h4>
                <p>
                  We reserve the right to suspend or terminate your account at our discretion if you violate any terms or engage in harmful activities.
                </p>
              </>
            ) : (
              <>
                <p>
                  At Tirbeo, we take your privacy seriously. This Privacy Policy describes how we collect, use, and protect your personal information.
                </p>
                <h4 className="font-semibold text-[var(--wave-text)] text-base pt-3">1. Information Collection</h4>
                <p>
                  We collect information you provide directly to us, such as your email address when signing up or signing in via third-party OAuth providers (Google, GitHub, Discord).
                </p>
                <h4 className="font-semibold text-[var(--wave-text)] text-base pt-3">2. Data Security</h4>
                <p>
                  We implement robust end-to-end encryption and administrative security measures to protect your account data against unauthorized access or disclosure.
                </p>
                <h4 className="font-semibold text-[var(--wave-text)] text-base pt-3">3. Third-Party Services</h4>
                <p>
                  We do not sell your personal data. Authentication partners only receive necessary parameters to verify your identity securely.
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-[var(--wave-outline-variant)] flex justify-end">
            <button
              onClick={onClose}
              className="wave-btn wave-btn-primary"
              style={{ width: 'auto', padding: '0 1.5rem' }}
            >
              <span className="relative z-10">I Understand</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, FileText } from "lucide-react";
import { PrimaryButton } from "./ui/ig-ui";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
}) => {

  // Prevent background scrolling while the modal is open.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-scrim backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl glass text-fg sm:max-h-[min(760px,90vh)] sm:rounded-3xl"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-divider px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-field text-text-3">
                  <FileText className="size-[18px]" />
                </div>

                <div className="min-w-0">
                  <h2
                    id="legal-modal-title"
                    className="truncate text-[22px] text-fg"
                  >
                    Terms of Service
                  </h2>
                  <p className="text-[15px] text-text-4">Tirbeo</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border-none bg-transparent text-muted transition-colors hover:bg-hover hover:text-fg"
              >
                <X className="size-[18px]" />
              </button>
            </header>

            {/* Content */}
            <main className="min-h-0 max-h-[60vh] flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="space-y-4 text-[18px] leading-relaxed text-text-2">
                <>
                  <p>
                      Welcome to Tirbeo. By creating an account or accessing
                      our platform, you agree to comply with and be bound by
                      the following Terms of Service.
                    </p>

                    <LegalSection title="1. Account Security">
                      You are responsible for maintaining the confidentiality
                      of your credentials and for all activities that occur
                      under your account. Notify us immediately of any
                      unauthorized usage.
                    </LegalSection>

                    <LegalSection title="2. Usage Rights">
                      Tirbeo grants you a limited, non-exclusive,
                      non-transferable license to access and use our web
                      services in accordance with these terms.
                    </LegalSection>

                    <LegalSection title="3. Termination">
                      We reserve the right to suspend or terminate your account
                      at our discretion if you violate any terms or engage in
                      harmful activities.
                    </LegalSection>
                </>
              </div>
            </main>

            {/* Footer */}
            <footer className="shrink-0 border-t border-divider px-5 py-4 sm:px-6">
              <PrimaryButton type="button" onClick={onClose}>
                I understand
              </PrimaryButton>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

const LegalSection: React.FC<LegalSectionProps> = ({
  title,
  children,
}) => {
  return (
    <section className="border-b border-divider pb-4">
      <h3 className="mb-2 text-[19px] text-fg">{title}</h3>

      <p>{children}</p>
    </section>
  );
};


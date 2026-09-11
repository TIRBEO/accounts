import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ShieldCheck, FileText, Check } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  type: "terms" | "privacy" | null;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  type,
  onClose,
}) => {
  const isTerms = type === "terms";

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
      {isOpen && type && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
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
            className="
              absolute
              inset-0
              cursor-default
              bg-black/75
              backdrop-blur-md
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            initial={{
              opacity: 0,
              y: 28,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            transition={{
              duration: 0.24,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="
              relative
              z-10
              flex
              max-h-[92dvh]
              w-full
              max-w-2xl
              flex-col
              overflow-hidden
              rounded-t-[28px]
              border
              border-white/[0.09]
              bg-[#000000]
              shadow-[0_30px_100px_rgba(0,0,0,0.65)]
              sm:max-h-[min(760px,90vh)]
              sm:rounded-[28px]
            "
          >
            {/* Mobile handle */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-9 rounded-full bg-white/15" />
            </div>

            {/* Header */}
            <header
              className="
                flex
                shrink-0
                items-center
                justify-between
                border-b
                border-white/[0.07]
                px-5
                py-4
                sm:px-6
                sm:py-5
              "
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-white/[0.045]
                    text-white/75
                  "
                >
                  {isTerms ? (
                    <FileText className="h-[18px] w-[18px]" />
                  ) : (
                    <ShieldCheck className="h-[19px] w-[19px]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                    Tirbeo
                  </div>

                  <h2
                    id="legal-modal-title"
                    className="truncate text-base font-semibold tracking-tight text-white/90 sm:text-lg"
                  >
                    {isTerms ? "Terms of Service" : "Privacy Policy"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="
                  ml-3
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-transparent
                  text-white/40
                  transition
                  hover:border-white/[0.07]
                  hover:bg-white/[0.05]
                  hover:text-white/80
                  active:scale-95
                "
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>

            {/* Content */}
            <main
              className="
                min-h-0
                flex-1
                overflow-y-auto
                overscroll-contain
                px-5
                py-5
                sm:px-7
                sm:py-6
              "
            >
              <div
                className="
                  space-y-5
                  text-[13px]
                  leading-7
                  text-white/55
                  [&::-webkit-scrollbar]:w-1
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:bg-white/10
                "
              >
                {isTerms ? (
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
                ) : (
                  <>
                    <p>
                      At Tirbeo, we take your privacy seriously. This Privacy
                      Policy describes how we collect, use, and protect your
                      personal information.
                    </p>

                    <LegalSection title="1. Information Collection">
                      We collect information you provide directly to us, such
                      as your email address when signing up or signing in via
                      third-party OAuth providers (Google, GitHub, Discord).
                    </LegalSection>

                    <LegalSection title="2. Data Security">
                      We implement robust end-to-end encryption and
                      administrative security measures to protect your account
                      data against unauthorized access or disclosure.
                    </LegalSection>

                    <LegalSection title="3. Third-Party Services">
                      We do not sell your personal data. Authentication
                      partners only receive necessary parameters to verify your
                      identity securely.
                    </LegalSection>
                  </>
                )}
              </div>
            </main>

            {/* Footer */}
            <footer
              className="
                flex
                shrink-0
                items-center
                justify-between
                gap-4
                border-t
                border-white/[0.07]
                bg-[#000000]
                px-5
                py-4
                sm:px-7
                sm:py-5
              "
            >
              <div className="hidden items-center gap-2 text-[11px] text-white/30 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Your information matters.</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-white
                  px-6
                  text-sm
                  font-semibold
                  text-black
                  shadow-[0_8px_30px_rgba(255,255,255,0.08)]
                  transition-all
                  hover:bg-white/90
                  active:scale-[0.98]
                  sm:w-auto
                "
              >
                <Check className="h-4 w-4" />
                I Understand
              </button>
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
    <section className="rounded-2xl border border-white/[0.055] bg-white/[0.018] px-4 py-4 sm:px-5">
      <h3 className="mb-2 text-sm font-semibold tracking-tight text-white/85">
        {title}
      </h3>

      <p>{children}</p>
    </section>
  );
};

export default TermsModal;
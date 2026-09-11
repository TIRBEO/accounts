import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex sm:hidden">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close bottom sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Bottom sheet'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="absolute bottom-0 left-0 right-0 z-10 flex max-h-[80vh] flex-col rounded-t-[28px] bg-[var(--tb-bg)] text-[var(--tb-text)] shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"
          >
            {/* Handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <span className="h-1 w-9 rounded-full bg-[var(--tb-outline-variant)]" />
            </div>

            {/* Title */}
            {title && (
              <div className="shrink-0 border-b border-[var(--tb-outline-variant)] px-6 py-3">
                <h2 className="text-base font-semibold text-[var(--tb-text)]">
                  {title}
                </h2>
              </div>
            )}

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;

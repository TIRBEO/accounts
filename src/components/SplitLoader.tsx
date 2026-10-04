import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BrandMark } from './ui/ig-ui';

export const SplitLoader: React.FC<{ active: boolean }> = ({ active }) => {
  const [visible, setVisible] = useState(active);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
    setVisible(true);
  }, [active]);

  if (!visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-9999 grid place-items-center bg-bg/70 backdrop-blur-2xl"
      style={{ pointerEvents: active ? 'auto' : 'none' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-7"
      >
        <BrandMark size="lg" />

        {/* Indeterminate rail — a travelling azure segment, the standard
            "working, duration unknown" signal. */}
        <div
          className="relative h-px w-[168px] overflow-hidden rounded-full bg-white/[0.12]"
          role="presentation"
        >
          <motion.div
            className="absolute inset-y-0 w-[54px] rounded-full bg-white/80"
            animate={reduceMotion ? undefined : { x: ['-54px', '168px'] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 1.15, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }
            }
          />
        </div>
      </motion.div>
    </motion.div>
  );
};
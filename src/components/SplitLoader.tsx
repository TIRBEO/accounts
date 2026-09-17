import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(9,9,11,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        pointerEvents: active ? 'auto' : 'none',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <img
          src="/logo-opt.png"
          alt=""
          width={96}
          height={64}
          draggable={false}
          decoding="async"
          style={{ width: 72, height: 'auto', filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))', userSelect: 'none' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontFamily: "'Google Sans', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#FAFAFA',
              lineHeight: 1,
              textShadow: '0 1px 10px rgba(0,0,0,0.35)',
            }}
          >
            Tirbeo
          </span>

          {/* big slider track */}
          <div
            style={{
              width: 148,
              height: 4,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <motion.div
              animate={reduceMotion ? undefined : { x: [-52, 148] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 1.1, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }
              }
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 52,
                borderRadius: 999,
                background: '#fff',
                boxShadow: '0 0 10px rgba(255,255,255,0.5)',
              }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

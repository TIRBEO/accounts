import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export const SplitLoader: React.FC<{ active: boolean }> = ({ active }) => {
  const [visible, setVisible] = useState(active);
  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => setVisible(false), 650);
      return () => clearTimeout(t);
    } else setVisible(true);
  }, [active]);

  if (!visible) return null;
  return (
    <motion.div
      initial={false}
      animate={active ? 'visible' : 'hidden'}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: active ? 'auto' : 'none', overflow: 'hidden', background: 'transparent' }}
    >
      {/* top — pure black */}
      <motion.div
        variants={{ visible: { y: 0 }, hidden: { y: '-100%' } }}
        transition={{ duration: 0.62, ease: [0.76, 0, 0.24, 1] }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50.5%', background: '#000000', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '18px' }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>Tirbeo</span>
      </motion.div>
      {/* bottom — pure black */}
      <motion.div
        variants={{ visible: { y: 0 }, hidden: { y: '100%' } }}
        transition={{ duration: 0.62, ease: [0.76, 0, 0.24, 1] }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50.5%', background: '#000000', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '18px' }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>Accounts</span>
      </motion.div>
      {/* center track — no T */}
      <motion.div
        variants={{ visible: { opacity: 1, scale: 1 }, hidden: { opacity: 0, scale: 0.92 } }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
      >
        <div style={{ width: '48px', height: '2px', borderRadius: '999px', background: 'rgba(255,255,255,0.14)', overflow: 'hidden', position: 'relative' }}>
          <motion.div animate={{ x: ['-48px', '48px'] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: 0, bottom: 0, width: '22px', background: '#0095F6', borderRadius: '999px' }} />
        </div>
      </motion.div>
      {/* hairline */}
      <motion.div
        variants={{ visible: { scaleX: 1, opacity: 1 }, hidden: { scaleX: 0, opacity: 0 } }}
        transition={{ duration: 0.32 }}
        style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.08)', transformOrigin: 'center', zIndex: 1 }}
      />
    </motion.div>
  );
};

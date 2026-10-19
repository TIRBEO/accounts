import React, { useEffect, useState } from 'react';
import { BrandMark } from './ui/ig-ui';

export const SplitLoader: React.FC<{ active: boolean }> = ({ active }) => {
  /* Revealed, not immediate: an answer that arrives inside 120ms never paints
     an overlay at all, so a fast route reads as instant instead of a blur
     flash. Slow waits still get the full rail. */
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active) {
      setLeaving(true);
      const t = setTimeout(() => {
        setLeaving(false);
        setVisible(false);
      }, 320);
      return () => clearTimeout(t);
    }
    setLeaving(false);
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={`split-overlay${leaving ? ' is-leaving' : ''}`}
    >
      <div className="flex flex-col items-center gap-7">
        <BrandMark size="lg" onCanvas />

        {/* Indeterminate rail — a travelling azure segment, the standard
            "working, duration unknown" signal. */}
        <div className="split-rail" role="presentation" />
      </div>
    </div>
  );
};

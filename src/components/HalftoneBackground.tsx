import React from 'react';

/**
 * OBSIDIAN BACKGROUND — static, CSS-only.
 * Pitch black with one soft light behind the card and a faint hairline grid.
 * No animation loop: instant paint, zero CPU while idle.
 */
export const HalftoneBackground: React.FC = () => (
  <div className="ob-bg" aria-hidden="true">
    <div className="ob-grid" />
    <div className="ob-glow" />
  </div>
);

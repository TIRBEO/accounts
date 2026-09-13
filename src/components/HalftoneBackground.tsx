import React from "react";

/**
 * NOIR EDITORIAL BACKGROUND — Obsidian + grid + ambient glow
 * Replaces flat black. Pure CSS, no image asset.
 */
export const HalftoneBackground: React.FC = () => {
  return (
    <div className="accounts-noir-bg" aria-hidden="true">
      <div className="accounts-noir-grid" />
      <div className="accounts-noir-noise" />
      <div className="accounts-noir-topline" />
      {/* Ambient orbs */}
      <div className="absolute left-[14%] top-[10%] h-[420px] w-[560px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-[90px]" />
      <div className="absolute right-[8%] bottom-[12%] h-[520px] w-[640px] translate-x-1/4 rounded-full bg-white/[0.025] blur-[110px]" />
      <div className="accounts-noir-vignette" />
    </div>
  );
};

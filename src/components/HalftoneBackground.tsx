import React from "react";

/**
 * OBSIDIAN BACKGROUND — PURE BLACK & WHITE
 * Static CSS-only backdrop. Deep black + soft white glows.
 * No animation / no JS work after paint.
 */
export const HalftoneBackground: React.FC = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#000000]"
      aria-hidden="true"
    >
      {/* Soft white glow behind card area */}
      <div className="absolute left-1/2 top-[38%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-[140px]" />

      {/* Secondary glow — slightly higher */}
      <div className="absolute left-1/2 top-[22%] h-[240px] w-[400px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[100px]" />

      {/* Top edge line */}
      <div className="absolute left-1/2 top-0 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Fine halftone dots — very subtle texture */}
      <div className="absolute inset-0 opacity-[0.02] [background-image:radial-gradient(circle,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_65%)]" />

      {/* Bottom vignette */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent" />

      {/* Side vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
};
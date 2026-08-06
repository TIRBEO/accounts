"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Avoid hydration mismatch: render the neutral button on the first pass,
  // then show the correct icon once the client theme has resolved.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="fixed top-5 right-5 z-[9999] flex h-11 w-11 items-center justify-center border-2 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-0 active:translate-y-0"
      style={{
        background: "var(--card, #fff)",
        borderColor: "var(--border, #17150f)",
        boxShadow: "3px 3px 0 var(--border, #17150f)",
        color: "var(--foreground, #17150f)",
      }}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

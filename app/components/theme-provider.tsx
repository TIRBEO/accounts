"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";
interface ThemeContextType { theme: Theme; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const COOKIE = "tirbeo_theme";
const THEMES: Theme[] = ["dark", "light"];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}

function resolveTheme(): Theme {
  const saved = getCookie(COOKIE);
  if (saved === "light" || saved === "dark") return saved as Theme;
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = resolveTheme();
    setTheme(t);
    document.documentElement.classList.remove(...THEMES);
    document.documentElement.classList.add(t);
    setCookie(COOKIE, t);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove(...THEMES);
    document.documentElement.classList.add(next);
    setCookie(COOKIE, next);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: "dark" as Theme, toggleTheme: () => {} };
  return ctx;
}

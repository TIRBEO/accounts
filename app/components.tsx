'use client';
import { useEffect, useState, createContext, useContext } from 'react';

interface ThemeColors {
  [key: string]: string;
}

interface ThemeBrand {
  name: string;
  tagline: string;
  logo: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  brand: ThemeBrand;
  loading: boolean;
}

const ThemeCtx = createContext<ThemeContextType>({ colors: {}, brand: { name: 'Tirbeo', tagline: '', logo: '' }, loading: true });

export function useThemeConfig() { return useContext(ThemeCtx); }

const DEFAULT_COLORS: ThemeColors = {
  '--bg': '#050505',
  '--bg-surface': '#0A0A0A',
  '--bg-card': '#111111',
  '--bg-elevated': '#1A1A1A',
  '--text': '#FFFFFF',
  '--text-secondary': '#C8C8D0',
  '--text-muted': '#8A8A8A',
  '--accent': '#4F8CFF',
  '--accent-hover': '#6B9BFF',
  '--accent-muted': '#4F8CFF',
  '--success': '#3FB950',
  '--warning': '#D8B36A',
  '--danger': '#E45D5D',
  '--border': 'rgba(255,255,255,0.06)',
  '--border-hover': 'rgba(255,255,255,0.12)',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [brand, setBrand] = useState<ThemeBrand>({ name: 'Tirbeo', tagline: '', logo: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.tirbeo.app';
    fetch(`${API}/api/public/theme`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.colors) setColors(data.colors);
        if (data?.brand) setBrand(data.brand);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, val] of Object.entries(colors)) {
      if (key.startsWith('--') && val) root.style.setProperty(key, val);
    }
  }, [colors]);

  return <ThemeCtx.Provider value={{ colors, brand, loading }}>{children}</ThemeCtx.Provider>;
}

/**
 * Tirbeo Accounts — COMPACT · Fast · Small
 * Tight, dense, no bloat. Every px counts.
 */

export const COLORS = {
  bg: '#050507',
  bgSoft: '#0A0A0C',
  bgElevated: '#111113',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  surfaceActive: 'rgba(255,255,255,0.08)',
  surface2: '#18181B',
  surface3: '#232326',

  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textFaint: '#52525B',

  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.12)',
  borderHover: 'rgba(255,255,255,0.14)',
  borderFocus: 'rgba(0,149,246,0.50)',

  primary: '#0095F6',
  primaryHover: '#0081D6',
  primaryActive: '#0077C5',
  primaryMuted: 'rgba(0,149,246,0.12)',
  primaryText: '#FFFFFF',
  primaryRing: 'rgba(0,149,246,0.22)',

  accent: '#0095F6',
  accentHover: '#0081D6',
  accentMuted: 'rgba(0,149,246,0.10)',

  error: '#FF3040',
  errorMuted: 'rgba(255,48,64,0.08)',
  errorBorder: 'rgba(255,48,64,0.18)',
  success: '#10B981',
  successMuted: 'rgba(16,185,129,0.08)',
  warning: '#FFB800',

  googleBg: '#FFFFFF',
  googleText: '#111113',
  githubBg: '#111113',
  githubText: '#FFFFFF',
  discordBg: '#5865F2',
  discordText: '#FFFFFF',
};

export const SPACING = { xs: '7px', sm: '12px', md: '19px', lg: '26px', xl: '35px', xxl: '46px', '3xl': '64px' };
export const RADIUS = { xs: '13px', sm: '16px', md: '20px', lg: '26px', xl: '35px', '2xl': '41px', pill: '9999px', full: '50%' };

export const TYPOGRAPHY = {
  fontFamily: "'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  h1: { size: '44px', weight: '700', lineHeight: '46px', letterSpacing: '-0.04em' },
  h2: { size: '32px', weight: '700', lineHeight: '34px', letterSpacing: '-0.03em' },
  h3: { size: '24px', weight: '700', lineHeight: '30px', letterSpacing: '-0.02em' },
  body: { size: '19px', weight: '400', lineHeight: '28px', letterSpacing: '-0.01em' },
  bodySmall: { size: '17px', weight: '400', lineHeight: '25px', letterSpacing: '-0.01em' },
  caption: { size: '13px', weight: '700', lineHeight: '17px', letterSpacing: '0.1em', textTransform: 'uppercase' as const },
  link: { size: '17px', weight: '600', lineHeight: '25px' },
  display: { size: '32px', weight: '700', lineHeight: '34px', letterSpacing: '-0.04em' },
};

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.35)',
  md: '0 4px 12px rgba(0,0,0,0.35)',
  lg: '0 8px 24px rgba(0,0,0,0.45)',
  xl: '0 12px 32px rgba(0,0,0,0.50)',
  focus: '0 0 0 3px rgba(0,149,246,0.16)',
  glow: '0 4px 16px rgba(0,149,246,0.22)',
  card: '0 0 0 1px rgba(255,255,255,0.06) inset, 0 12px 32px rgba(0,0,0,0.50)',
};

export const TRANSITIONS = { fast: '120ms ease', normal: '160ms ease', slow: '220ms ease', spring: '320ms cubic-bezier(0.16,1,0.3,1)' };
export const Z_INDEX = { dropdown: 100, modal: 200, toast: 300, tooltip: 400 };
export const BREAKPOINTS = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };

export const INPUT_STYLES = {
  base: {
    width: '100%',
    height: '56px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    color: COLORS.text,
    fontSize: '16px',
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: '0 16px',
    outline: 'none',
    transition: `all ${TRANSITIONS.fast}`,
  },
};

export const BUTTON_STYLES = {
  primary: {
    background: '#0095F6',
    color: '#FFF',
    border: '1px solid #0095F6',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: TYPOGRAPHY.fontFamily,
    height: '52px',
    padding: '0 20px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0,149,246,0.22)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.04)',
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: '0 20px',
    height: '52px',
    cursor: 'pointer',
  },
  danger: { background: COLORS.error, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 700, fontFamily: TYPOGRAPHY.fontFamily, height: '52px', padding: '0 20px', cursor: 'pointer' },
  link: { background: 'transparent', color: '#0095F6', border: 'none', fontSize: '15px', fontWeight: 600, fontFamily: TYPOGRAPHY.fontFamily, padding: 0, cursor: 'pointer' },
};

export const FOCUS_VISIBLE = { outline: 'none', boxShadow: SHADOWS.focus };
export const FOCUS_RING = { outline: 'none', boxShadow: `0 0 0 3px rgba(0,149,246,0.18)` };
export const ANIMATION = {
  spring: { type: 'spring', stiffness: 420, damping: 30 },
  easeOut: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  easeInOut: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  fadeIn: { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } },
  slideUp: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } },
};
export const KEYFRAMES = `@keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } } @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 8px rgba(0,149,246,0.2); } 50% { box-shadow: 0 0 24px rgba(0,149,246,0.4); } }`;
export function injectGlobalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('accounts-design-keyframes')) return;
  const s = document.createElement('style'); s.id = 'accounts-design-keyframes'; s.textContent = KEYFRAMES; document.head.appendChild(s);
}

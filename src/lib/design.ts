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
  primaryHover: '#0084DB',
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
  success: '#00C950',
  successMuted: 'rgba(0,201,80,0.08)',
  warning: '#FFB800',

  googleBg: '#FFFFFF',
  googleText: '#111113',
  githubBg: '#111113',
  githubText: '#FFFFFF',
  discordBg: '#5865F2',
  discordText: '#FFFFFF',
};

export const SPACING = { xs: '6px', sm: '10px', md: '16px', lg: '22px', xl: '29px', xxl: '38px', '3xl': '53px' };
export const RADIUS = { xs: '11px', sm: '13px', md: '17px', lg: '22px', xl: '29px', '2xl': '34px', pill: '9999px', full: '50%' };

export const TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Inter', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  h1: { size: '38px', weight: '750', lineHeight: '38px', letterSpacing: '-0.03em' },
  h2: { size: '26px', weight: '700', lineHeight: '29px', letterSpacing: '-0.02em' },
  h3: { size: '19px', weight: '650', lineHeight: '26px' },
  body: { size: '17px', weight: '400', lineHeight: '25px' },
  bodySmall: { size: '16px', weight: '400', lineHeight: '23px' },
  caption: { size: '12.5px', weight: '700', lineHeight: '15px', letterSpacing: '0.07em', textTransform: 'uppercase' as const },
  link: { size: '16px', weight: '600', lineHeight: '23px' },
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
    height: '60px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '14px',
    color: COLORS.text,
    fontSize: '17px',
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
    border: 'none',
    borderRadius: '10px',
    fontSize: '17px',
    fontWeight: 650,
    fontFamily: TYPOGRAPHY.fontFamily,
    height: '58px',
    padding: '0 24px',
    cursor: 'pointer',
    boxShadow: 'none',
  },
  ghost: {
    background: 'rgba(255,255,255,0.05)',
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: '0 22px',
    height: '58px',
    cursor: 'pointer',
  },
  danger: { background: COLORS.error, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 700, fontFamily: TYPOGRAPHY.fontFamily, height: '58px', padding: '0 24px', cursor: 'pointer' },
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
export const KEYFRAMES = `@keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
export function injectGlobalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('accounts-design-keyframes')) return;
  const s = document.createElement('style'); s.id = 'accounts-design-keyframes'; s.textContent = KEYFRAMES; document.head.appendChild(s);
}

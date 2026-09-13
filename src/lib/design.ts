/**
 * Tirbeo Accounts — INFINITE · Instagram Blue
 * Big, spacious, full-bleed. No constraints.
 */

export const COLORS = {
  bg: '#050507',
  bgSoft: '#0A0A0C',
  bgElevated: '#111113',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  surfaceActive: 'rgba(255,255,255,0.09)',
  surface2: '#18181B',
  surface3: '#232326',

  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textFaint: '#52525B',

  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderHover: 'rgba(255,255,255,0.18)',
  borderFocus: 'rgba(0,149,246,0.55)',

  primary: '#0095F6',
  primaryHover: '#0084DB',
  primaryActive: '#0077C5',
  primaryMuted: 'rgba(0,149,246,0.14)',
  primaryText: '#FFFFFF',
  primaryRing: 'rgba(0,149,246,0.30)',

  accent: '#0095F6',
  accentHover: '#0081D6',
  accentMuted: 'rgba(0,149,246,0.12)',

  error: '#FF3040',
  errorMuted: 'rgba(255,48,64,0.10)',
  errorBorder: 'rgba(255,48,64,0.22)',
  success: '#00C950',
  successMuted: 'rgba(0,201,80,0.10)',
  warning: '#FFB800',

  googleBg: '#FFFFFF',
  googleText: '#111113',
  githubBg: '#111113',
  githubText: '#FFFFFF',
  discordBg: '#5865F2',
  discordText: '#FFFFFF',
};

export const SPACING = { xs: '6px', sm: '10px', md: '16px', lg: '24px', xl: '32px', xxl: '56px', '3xl': '80px' };
export const RADIUS = { xs: '10px', sm: '12px', md: '16px', lg: '20px', xl: '28px', '2xl': '32px', pill: '9999px', full: '50%' };

export const TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Instrument Serif', Georgia, serif",
  fontMono: "'JetBrains Mono', monospace",
  h1: { size: '42px', weight: '800', lineHeight: '42px', letterSpacing: '-0.04em' },
  h2: { size: '30px', weight: '750', lineHeight: '32px', letterSpacing: '-0.03em' },
  h3: { size: '20px', weight: '650', lineHeight: '26px' },
  body: { size: '16px', weight: '400', lineHeight: '24px' },
  bodySmall: { size: '14.5px', weight: '400', lineHeight: '21px' },
  caption: { size: '11px', weight: '700', lineHeight: '14px', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  link: { size: '14.5px', weight: '600', lineHeight: '20px' },
};

export const SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.4)',
  md: '0 8px 32px rgba(0,0,0,0.55)',
  lg: '0 16px 48px rgba(0,0,0,0.60)',
  xl: '0 24px 64px rgba(0,0,0,0.65)',
  focus: '0 0 0 4px rgba(0,149,246,0.18)',
  glow: '0 12px 40px rgba(0,149,246,0.32)',
  card: '0 0 0 1px rgba(255,255,255,0.07) inset, 0 32px 80px rgba(0,0,0,0.65)',
};

export const TRANSITIONS = { fast: '140ms ease', normal: '220ms ease', slow: '360ms ease', spring: '400ms cubic-bezier(0.16,1,0.3,1)' };
export const Z_INDEX = { dropdown: 100, modal: 200, toast: 300, tooltip: 400 };
export const BREAKPOINTS = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' };

export const INPUT_STYLES = {
  base: {
    width: '100%',
    height: '56px',
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '14px',
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
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 650,
    fontFamily: TYPOGRAPHY.fontFamily,
    height: '44px',
    padding: '0 20px',
    cursor: 'pointer',
    boxShadow: 'none',
  },
  ghost: {
    background: 'rgba(255,255,255,0.06)',
    color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: '0 18px',
    height: '44px',
    cursor: 'pointer',
  },
  danger: { background: COLORS.error, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, fontFamily: TYPOGRAPHY.fontFamily, height: '44px', padding: '0 20px', cursor: 'pointer' },
  link: { background: 'transparent', color: '#0095F6', border: 'none', fontSize: '14.5px', fontWeight: 600, fontFamily: TYPOGRAPHY.fontFamily, padding: 0, cursor: 'pointer' },
};

export const FOCUS_VISIBLE = { outline: 'none', boxShadow: SHADOWS.focus };
export const FOCUS_RING = { outline: 'none', boxShadow: `0 0 0 4px rgba(0,149,246,0.22)` };
export const ANIMATION = {
  spring: { type: 'spring', stiffness: 380, damping: 30 },
  easeOut: { duration: 0.30, ease: [0.16, 1, 0.3, 1] },
  easeInOut: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  fadeIn: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
  slideUp: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
};
export const KEYFRAMES = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
`;
export function injectGlobalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('accounts-design-keyframes')) return;
  const s = document.createElement('style'); s.id = 'accounts-design-keyframes'; s.textContent = KEYFRAMES; document.head.appendChild(s);
}

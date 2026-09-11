/**
 * Accounts App Design System
 * True black Instagram-inspired theme
 */

export const COLORS = {
  bg: '#000000',
  surface: '#0d0d0d',
  surface2: '#111111',
  surface3: '#161616',

  text: '#f5f5f5',
  textSecondary: '#a0a0a0',
  textMuted: '#707070',
  textFaint: '#484848',

  border: '#2a2a2a',
  borderHover: '#3a3a3a',
  borderFocus: '#3a3a3a',

  primary: '#0095f6',
  primaryHover: '#1877f2',
  primaryMuted: 'rgba(0,149,246,0.15)',
  primaryText: '#ffffff',

  error: '#ed4956',
  errorMuted: 'rgba(237,73,86,0.12)',
  success: '#58c322',
  successMuted: 'rgba(88,195,34,0.12)',
  warning: '#f5a623',
  warningMuted: 'rgba(245,166,35,0.12)',

  googleBg: '#ffffff',
  googleText: '#18181b',
  githubBg: '#18181b',
  githubText: '#fafafa',
  discordBg: '#5865F2',
  discordText: '#ffffff',

};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  pill: '9999px',
  full: '50%',
};

export const TYPOGRAPHY = {
  fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontMono: "'SF Mono',ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
  h1: { size: '32px', weight: '700', lineHeight: '40px', letterSpacing: '-0.02em' },
  h2: { size: '32px', weight: '700', lineHeight: '42px', letterSpacing: '-0.01em' },
  h3: { size: '20px', weight: '600', lineHeight: '28px' },
  body: { size: '17px', weight: '400', lineHeight: '24px' },
  bodySmall: { size: '15px', weight: '400', lineHeight: '20px' },
  caption: { size: '12px', weight: '500', lineHeight: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  link: { size: '16px', weight: '500', lineHeight: '24px' },
};

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.4)',
  md: '0 4px 12px rgba(0,0,0,0.5)',
  lg: '0 8px 24px rgba(0,0,0,0.6)',
  focus: '0 0 0 2px rgba(0,149,246,0.3)',
};

export const TRANSITIONS = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
};

export const Z_INDEX = {
  dropdown: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
};

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
};

export const INPUT_STYLES = {
  base: {
    width: '100%',
    height: '56px',
    background: COLORS.surface2,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '14px',
    color: COLORS.text,
    fontSize: '16px',
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: '0 24px',
    outline: 'none',
    transition: `border-color ${TRANSITIONS.fast}, box-shadow ${TRANSITIONS.fast}`,
  },
};

export const BUTTON_STYLES = {
  primary: {
    background: COLORS.primary,
    color: COLORS.primaryText,
    border: 'none',
    borderRadius: '14px',
    fontSize: '17px',
    fontWeight: 700,
    fontFamily: TYPOGRAPHY.fontFamily,
    height: '56px',
    padding: '0 32px',
    cursor: 'pointer',
    transition: `opacity ${TRANSITIONS.fast}`,
  },
  ghost: {
    background: 'transparent',
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '14px',
    fontSize: '17px',
    fontWeight: 500,
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: '0 20px',
    height: '56px',
    cursor: 'pointer',
    transition: `background-color ${TRANSITIONS.fast}, border-color ${TRANSITIONS.fast}, color ${TRANSITIONS.fast}`,
  },
  danger: {
    background: COLORS.error,
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: TYPOGRAPHY.fontFamily,
    height: '52px',
    padding: '0 24px',
    cursor: 'pointer',
    transition: `background-color ${TRANSITIONS.fast}`,
  },
  link: {
    background: 'transparent',
    color: COLORS.primary,
    border: 'none',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: TYPOGRAPHY.fontFamily,
    padding: 0,
    cursor: 'pointer',
    textDecoration: 'none',
  },
};

export const FOCUS_VISIBLE = {
  outline: 'none',
  boxShadow: SHADOWS.focus,
};

export const FOCUS_RING = {
  outline: 'none',
  boxShadow: `0 0 0 2px ${COLORS.bg}, 0 0 0 4px ${COLORS.primary}`,
};

export const ANIMATION = {
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  easeOut: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  easeInOut: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  fadeIn: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
  slideUp: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
};

export const KEYFRAMES = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

export function injectGlobalStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('accounts-design-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'accounts-design-keyframes';
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

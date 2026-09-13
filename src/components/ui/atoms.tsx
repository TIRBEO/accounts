import React, { forwardRef, type InputHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { COLORS, RADIUS, TRANSITIONS, TYPOGRAPHY } from '../../lib/design';
const FONT = TYPOGRAPHY.fontFamily;

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string; error?: string; hint?: string; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; fullWidth?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, leftIcon, rightIcon, fullWidth = true, className = '', onFocus, onBlur, ...props }, ref) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: error ? COLORS.error : '#A1A1AA' }}>{label}</label>}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && <span style={{ position: 'absolute', left: '16px', display: 'flex', color: focused ? '#A1A1AA' : '#71717A', pointerEvents: 'none' }}>{leftIcon}</span>}
        <input ref={ref} {...props}
          style={{
            width: '100%', height: '56px',
            background: focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${focused ? COLORS.borderFocus : error ? COLORS.errorBorder : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '14px', color: '#FFF', fontSize: '16px', fontFamily: FONT,
            padding: leftIcon ? '0 16px 0 46px' : rightIcon ? '0 46px 0 16px' : '0 16px',
            outline: 'none', transition: `all ${TRANSITIONS.fast}`,
            boxShadow: focused ? `0 0 0 4px ${error ? 'rgba(255,48,64,0.10)' : COLORS.primaryRing}` : 'none',
          } as any}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }} className={className} />
        {rightIcon && <span style={{ position: 'absolute', right: '16px', display: 'flex', color: '#71717A' }}>{rightIcon}</span>}
      </div>
      {error && <p style={{ fontSize: '13px', color: COLORS.error, margin: 0, display: 'flex', gap: '6px', fontWeight: 600 }}><span>⚠</span>{error}</p>}
      {hint && !error && <p style={{ fontSize: '13px', color: '#71717A', margin: 0 }}>{hint}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'link'; fullWidth?: boolean; loading?: boolean; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'primary', fullWidth = false, loading = false, leftIcon, rightIcon, disabled, children, className = '', style, ...props }, ref) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    borderRadius: '8px', fontSize: '14px', fontWeight: variant === 'primary' ? 650 : 600, fontFamily: FONT,
    cursor: loading || disabled ? 'not-allowed' : 'pointer',
    transition: `all ${TRANSITIONS.fast}`, opacity: loading || disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto', minHeight: '44px', letterSpacing: '-0.01em',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: '#0095F6', color: '#fff', border: 'none', padding: '0 20px', boxShadow: 'none' },
    ghost: { background: 'rgba(255,255,255,0.06)', color: '#FAFAFA', border: '1px solid rgba(255,255,255,0.08)', padding: '0 20px' },
    danger: { background: COLORS.error, color: '#fff', border: 'none', padding: '0 22px' },
    link: { background: 'transparent', color: '#0095F6', border: 'none', padding: 0, minHeight: 'auto', textDecoration: 'underline', textUnderlineOffset: '3px' },
  };
  return (
    <button ref={ref} {...props} disabled={disabled || loading} style={{ ...base, ...variants[variant], ...style }} className={className}>
      {leftIcon}<span>{children}</span>{rightIcon}
    </button>
  );
});
Button.displayName = 'Button';

interface CardProps { children: React.ReactNode; elevated?: boolean; interactive?: boolean; className?: string; style?: React.CSSProperties; onClick?: () => void; }
export const Card = ({ children, elevated, interactive, className = '', style, onClick }: CardProps) => {
  const [h, setH] = React.useState(false);
  return <div className={className} style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: `1px solid ${h && interactive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', boxShadow: elevated ? '0 16px 48px rgba(0,0,0,0.60)' : '0 8px 32px rgba(0,0,0,0.45)', cursor: interactive ? 'pointer' : 'default', transition: `all ${TRANSITIONS.fast}`, ...style }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick}>{children}</div>;
};
interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'info'; className?: string; style?: React.CSSProperties; }
export const Badge = ({ children, variant = 'default', className = '', style }: BadgeProps) => {
  const m: any = { default: { bg: 'rgba(255,255,255,0.06)', c: '#A1A1AA' }, success: { bg: 'rgba(0,201,80,0.10)', c: '#00C950' }, warning: { bg: 'rgba(255,184,0,0.10)', c: '#FFB800' }, error: { bg: 'rgba(255,48,64,0.10)', c: '#FF3040' }, info: { bg: 'rgba(0,149,246,0.12)', c: '#0095F6' } };
  const v = m[variant] || m.default;
  return <span className={className} style={{ display: 'inline-flex', padding: '4px 10px', fontSize: '11px', fontWeight: 750, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '999px', background: v.bg, color: v.c, ...style }}>{children}</span>;
};
interface AvatarProps { src?: string | null; alt?: string; name?: string; size?: number; className?: string; }
export const Avatar = ({ src, alt, name, size = 72, className = '' }: AvatarProps) => {
  const i = name?.charAt(0).toUpperCase() || '?';
  return <div className={className} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>{src ? <img src={src} alt={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: size * 0.38, fontWeight: 800, color: '#A1A1AA' }}>{i}</span>}</div>;
};
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }
export const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => {
  const px = { sm: 16, md: 22, lg: 36 }[size];
  return (
    <span className={className} aria-hidden style={{ display: 'inline-flex', width: px, height: px, borderRadius: '999px', overflow: 'hidden', opacity: 0.7 }}>
      <span style={{ flex: 1, background: 'currentColor', opacity: 0.95 }} />
      <span style={{ flex: 1, background: 'currentColor', opacity: 0.18 }} />
    </span>
  );
};
interface SwitchProps { checked: boolean; onChange: (c: boolean) => void; disabled?: boolean; label?: string; className?: string; }
export const Switch = ({ checked, onChange, disabled, label, className = '' }: SwitchProps) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }} className={className}>
    <div style={{ position: 'relative', width: '48px', height: '28px', borderRadius: '999px', background: checked ? '#0095F6' : '#27272A', transition: `all ${TRANSITIONS.fast}`, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: `all ${TRANSITIONS.fast}` }} />
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
    </div>
    {label && <span style={{ fontSize: '14px', color: '#FAFAFA' }}>{label}</span>}
  </label>
);
Switch.displayName = 'Switch';
interface CheckboxProps { checked: boolean; onChange: (c: boolean) => void; disabled?: boolean; label?: string; className?: string; }
export const Checkbox = ({ checked, onChange, disabled, label, className = '' }: CheckboxProps) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }} className={className}>
    <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `1.5px solid ${checked ? '#0095F6' : 'rgba(255,255,255,0.14)'}`, background: checked ? '#0095F6' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} style={{ position: 'absolute', opacity: 0 }} />
    </div>
    {label && <span style={{ fontSize: '14px', color: '#FAFAFA' }}>{label}</span>}
  </label>
);
Checkbox.displayName = 'Checkbox';
interface SkeletonProps { width?: string | number; height?: string | number; radius?: string; className?: string; }
export const Skeleton = ({ width = '100%', height = '16px', radius = '14px', className = '' }: SkeletonProps) => (
  <div className={className} style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
);

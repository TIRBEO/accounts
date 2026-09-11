import React, { forwardRef, type InputHTMLAttributes, type ButtonHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { COLORS, RADIUS, TRANSITIONS, TYPOGRAPHY, SHADOWS } from '../../lib/design';

const FONT = TYPOGRAPHY.fontFamily;

/* ─── Input ─── */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, fullWidth = true, className = '', onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);

    return (
      <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label style={{ fontSize: '13px', fontWeight: 500, color: COLORS.textSecondary, marginBottom: '2px' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftIcon && (
            <span style={{ position: 'absolute', left: '14px', display: 'flex', alignItems: 'center', color: COLORS.textFaint, pointerEvents: 'none' }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            {...props}
            style={{
              width: '100%',
              background: COLORS.surface,
              border: `1px solid ${focused ? COLORS.borderFocus : error ? COLORS.error : COLORS.border}`,
              borderRadius: RADIUS.md,
              color: COLORS.text,
              fontSize: '15px',
              fontFamily: FONT,
              padding: leftIcon ? '13px 15px 13px 42px' : rightIcon ? '13px 42px 13px 15px' : '13px 15px',
              outline: 'none',
              transition: `border-color ${TRANSITIONS.fast}, box-shadow ${TRANSITIONS.fast}`,
              boxShadow: focused ? `0 0 0 3px ${COLORS.primaryMuted}` : 'none',
            } as React.CSSProperties}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            className={className}
          />
          {rightIcon && (
            <span style={{ position: 'absolute', right: '14px', display: 'flex', alignItems: 'center', color: COLORS.textFaint, pointerEvents: 'none' }}>
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <p style={{ fontSize: '13px', color: COLORS.error, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>{hint}</p>
        )}
      </div>
    );
  });
Input.displayName = 'Input';

/* ─── Button ─── */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'link';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', fullWidth = false, loading = false, leftIcon, rightIcon, disabled, children, className = '', style, ...props }, ref) => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      borderRadius: RADIUS.md,
      fontSize: '15px',
      fontWeight: variant === 'primary' || variant === 'danger' ? 600 : 500,
      fontFamily: FONT,
      cursor: loading || disabled ? 'not-allowed' : 'pointer',
      transition: `background-color ${TRANSITIONS.fast}, opacity ${TRANSITIONS.fast}, border-color ${TRANSITIONS.fast}, color ${TRANSITIONS.fast}`,
      opacity: loading || disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      minHeight: '48px',
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: { background: COLORS.primary, color: '#ffffff', border: 'none', padding: '13px 24px' },
      ghost: { background: 'transparent', color: COLORS.textSecondary, border: `1px solid ${COLORS.border}`, padding: '12px 20px' },
      danger: { background: COLORS.error, color: '#ffffff', border: 'none', padding: '13px 24px' },
      link: { background: 'transparent', color: COLORS.primary, border: 'none', padding: 0, minHeight: 'auto' },
    };

    return (
      <button
        ref={ref}
        {...props}
        disabled={disabled || loading}
        style={{ ...base, ...variants[variant], ...style }}
        className={className}
      >
        {loading && (
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
          </svg>
        )}
        {!loading && leftIcon}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  });
Button.displayName = 'Button';

/* ─── Card ─── */
interface CardProps {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card = ({ children, elevated = false, interactive = false, className = '', style, onClick }: CardProps) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      className={className}
      style={{
        ...style,
        background: COLORS.surface,
        border: `1px solid ${interactive && hovered ? COLORS.borderHover : COLORS.border}`,
        borderRadius: RADIUS.lg,
        boxShadow: elevated ? SHADOWS.lg : SHADOWS.sm,
        cursor: interactive && onClick ? 'pointer' : 'default',
        transition: `background ${TRANSITIONS.fast}, border-color ${TRANSITIONS.fast}, transform ${TRANSITIONS.fast}`,
        ...(interactive && hovered && { transform: 'translateY(-1px)' }),
      }}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

/* ─── Badge ─── */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  style?: React.CSSProperties;
}

export const Badge = ({ children, variant = 'default', className = '', style }: BadgeProps) => {
  const v: Record<string, { bg: string; color: string }> = {
    default: { bg: 'rgba(161,161,170,0.12)', color: COLORS.textSecondary },
    success: { bg: COLORS.successMuted, color: COLORS.success },
    warning: { bg: COLORS.warningMuted, color: COLORS.warning },
    error: { bg: COLORS.errorMuted, color: COLORS.error },
    info: { bg: COLORS.primaryMuted, color: COLORS.primary },
  };
  const s = v[variant] || v.default;
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: RADIUS.pill, background: s.bg, color: s.color, ...style }}>
      {children}
    </span>
  );
};

/* ─── Avatar ─── */
interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: number;
  className?: string;
}

export const Avatar = ({ src, alt, name, size = 72, className = '' }: AvatarProps) => {
  const initial = name?.charAt(0).toUpperCase() || '?';
  return (
    <div className={className} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: COLORS.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
      {src ? (
        <img src={src} alt={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: size * 0.375, fontWeight: 600, color: COLORS.textSecondary }}>{initial}</span>
      )}
    </div>
  );
};

/* ─── Spinner ─── */
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => {
  const px = { sm: 16, md: 24, lg: 40 }[size];
  return (
    <svg className={className} width={px} height={px} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={size === 'sm' ? 2 : 3} strokeLinecap="round" fill="none" strokeDasharray="30 70" />
    </svg>
  );
};

/* ─── Switch ─── */
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const Switch = ({ checked, onChange, disabled, label, className = '' }: SwitchProps) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }} className={className}>
    <div style={{ position: 'relative', width: '44px', height: '24px', borderRadius: RADIUS.pill, background: checked ? COLORS.primary : COLORS.surface3, transition: `background ${TRANSITIONS.fast}`, flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: '2px', left: checked ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: `transform ${TRANSITIONS.fast}` }} />
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer', zIndex: 1 }} />
    </div>
    {label && <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>{label}</span>}
  </label>
);
Switch.displayName = 'Switch';

/* ─── Checkbox ─── */
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  indeterminate?: boolean;
  className?: string;
}

export const Checkbox = ({ checked, onChange, disabled, label, indeterminate, className = '' }: CheckboxProps) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }} className={className}>
    <div style={{ width: '20px', height: '20px', borderRadius: RADIUS.sm, border: `1.5px solid ${checked ? COLORS.primary : COLORS.border}`, background: checked ? COLORS.primary : COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: `background ${TRANSITIONS.fast}, border-color ${TRANSITIONS.fast}`, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {(checked || indeterminate) && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer', zIndex: 1 }} />
    </div>
    {label && <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>{label}</span>}
  </label>
);
Checkbox.displayName = 'Checkbox';

/* ─── Skeleton ─── */
interface SkeletonProps { width?: string | number; height?: string | number; radius?: string; className?: string; }

export const Skeleton = ({ width = '100%', height = '16px', radius = RADIUS.md, className = '' }: SkeletonProps) => (
  <div className={className} style={{ width, height, borderRadius: radius, background: `linear-gradient(90deg, ${COLORS.surface} 25%, ${COLORS.surface2} 50%, ${COLORS.surface} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
);

'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface LoginMoreOptionsProps {
  email: string;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  isSubmitting: boolean;
  canSend: (method: string) => boolean;
  remainingSends: (method: string) => number;
  /** DB-configured max for a method (from /api/auth/limits + defaults). */
  getMaxSends: (method: string) => number;
  /** Immediate /api/auth/remaining sync (fresh used/remaining/resetAt). */
  refreshRemaining: () => Promise<void>;
  /** Server-reported window reset (epoch ms) for a method, 0 when none. */
  getResetAt: (method: string) => number;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onRequestCode: () => void;
  onRequestMagicLink: () => void;
  onRequestForgotPassword: () => void;
  onRequestRecoveryEmail: () => void;
  onBack: () => void;
}

const ANIM_KEYFRAMES = `
@keyframes moFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

let styleTagInjected = false;
function ensureStyles() {
  if (styleTagInjected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.textContent = ANIM_KEYFRAMES;
  document.head.appendChild(tag);
  styleTagInjected = true;
}

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  height: '52px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#A1A1AA',
  fontSize: '16px',
  fontWeight: 600,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
};

type OptionConfig = {
  id: string;
  label: string;
  detail: string;
  sends: number | null;
  max: number | null;
  disabled: boolean;
  cooldownRemaining: number;
  resetsAt: number;
  onClick: () => void;
};

const OptionRow = ({ option, index, isLast }: { option: OptionConfig; index: number; isLast: boolean }) => {
  const [hovered, setHovered] = React.useState(false);
  const delay = 0.06 + index * 0.05;
  const sends = Number(option.sends) || 0;
  const max = option.max === null ? null : Number(option.max);
  const cooldown = Number(option.cooldownRemaining) || 0;

  const icons: Record<string, React.ReactNode> = {
    code: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6M7 16h6"/></svg>,
    magic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4L18 8L14 12"/><path d="M10 8H18"/><path d="M4 12h6"/><path d="M4 16h10"/></svg>,
    forgot: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>,
    recovery: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8l-2-2-4 4 2 2z"/><path d="M4 12l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>,
  };

  return (
    <button
      type="button"
      onClick={option.onClick}
      disabled={option.disabled}
      className="login-more-option"
      style={{
        width: '100%',
        padding: '13px 13px 13px 14px',
        background: hovered && !option.disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered && !option.disabled ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 14,
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        opacity: option.disabled ? 0.42 : 1,
        transition: 'all 150ms ease',
        boxSizing: 'border-box',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: isLast ? 0 : 10,
        animation: `moFadeUp 0.32s ease ${delay}s both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ width: 38, height: 38, borderRadius: 10, background: hovered && !option.disabled ? '#0095F6' : 'rgba(255,255,255,0.06)', border: `1px solid ${hovered && !option.disabled ? '#0095F6' : 'rgba(255,255,255,0.06)'}`, display: 'grid', placeItems: 'center', flexShrink: 0, color: hovered && !option.disabled ? '#fff' : '#A1A1AA', transition: 'all 150ms ease' }}>
        {icons[option.id] ?? icons.code}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 14, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.01em' }}>{option.label}</span>
          {sends !== null && max !== null && (
            <span style={{ padding: '2px 7px', fontFamily: TYPOGRAPHY.fontFamily, fontSize: 10, fontWeight: 700, letterSpacing: '0.02em', borderRadius: 999, background: sends === 0 ? 'rgba(244,63,94,0.10)' : cooldown > 0 ? 'rgba(0,149,246,0.10)' : 'rgba(255,255,255,0.06)', color: sends === 0 ? '#f43f5e' : cooldown > 0 ? '#0095F6' : '#71717A', border: `1px solid ${sends === 0 ? 'rgba(244,63,94,0.16)' : cooldown > 0 ? 'rgba(0,149,246,0.16)' : 'rgba(255,255,255,0.07)'}` }}>
              {sends === 0 ? 'limit reached' : cooldown > 0 ? `${cooldown}s` : `${sends} of ${max} left`}
            </span>
          )}
        </div>
        <p style={{ fontFamily: TYPOGRAPHY.fontFamily, fontSize: 12.5, color: '#71717A', margin: '3px 0 0', lineHeight: 1.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sends === 0 && option.resetsAt > 0
            ? `Limit reached — resets at ${new Date(option.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : option.disabled && sends === 0
              ? 'Maximum attempts reached'
              : cooldown > 0
                ? `Wait ${cooldown}s`
                : option.detail}
        </p>
      </div>

      <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: hovered && !option.disabled ? '#fff' : 'transparent', border: `1px solid ${hovered && !option.disabled ? '#fff' : 'rgba(255,255,255,0.07)'}`, display: 'grid', placeItems: 'center', transition: 'all 150ms ease' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={hovered && !option.disabled ? '#09090B' : '#71717A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </span>
    </button>
  );
};

export const LoginMoreOptions: React.FC<LoginMoreOptionsProps> = ({
  email, loginProfile, isSubmitting, canSend, remainingSends, getMaxSends, refreshRemaining, getResetAt,
  isInCooldown, getCooldownRemaining,
  onRequestCode, onRequestMagicLink, onRequestForgotPassword, onRequestRecoveryEmail, onBack,
}) => {
  ensureStyles();

  // Fresh counts on open — the debounced sync may lag behind other tabs/sends.
  React.useEffect(() => {
    void refreshRemaining();
  }, [refreshRemaining]);

  const magicLinkSends = remainingSends('magic-link');
  const codeSends = remainingSends('login-otp');
  const forgotSends = remainingSends('otp');
  const recoverySends = loginProfile?.hasRecoveryEmail ? remainingSends('recovery') : 0;
  const magicLinkCooldown = isInCooldown('magic-link');
  const codeCooldown = isInCooldown('login-otp');
  const recoveryCooldown = isInCooldown('recovery');
  const forgotCooldown = isInCooldown('otp');

  const canCode = canSend('login-otp') && !codeCooldown && !isSubmitting;
  const canMagic = canSend('magic-link') && !magicLinkCooldown && !isSubmitting;
  const canForgot = canSend('otp') && !forgotCooldown && !isSubmitting;
  const canRecovery = loginProfile?.hasRecoveryEmail && canSend('recovery') && !recoveryCooldown && !isSubmitting;

  const photoUrl = loginProfile?.photoUrl;
  const displayName = loginProfile?.name || email.split('@')[0];

  const codeCooldownRemaining = isInCooldown('login-otp') ? getCooldownRemaining('login-otp') : 0;
  const magicCooldownRemaining = isInCooldown('magic-link') ? getCooldownRemaining('magic-link') : 0;
  const forgotCooldownRemaining = isInCooldown('otp') ? getCooldownRemaining('otp') : 0;
  const recoveryCooldownRemaining = isInCooldown('recovery') ? getCooldownRemaining('recovery') : 0;

  const options: OptionConfig[] = [
    { id: 'code', label: 'One-time code', detail: '6-digit code sent to your inbox', sends: codeSends, max: getMaxSends('login-otp'), disabled: !canCode, cooldownRemaining: codeCooldownRemaining, resetsAt: getResetAt('login-otp'), onClick: onRequestCode },
    { id: 'magic', label: 'Magic link', detail: 'Sign-in link sent to your email', sends: magicLinkSends, max: getMaxSends('magic-link'), disabled: !canMagic, cooldownRemaining: magicCooldownRemaining, resetsAt: getResetAt('magic-link'), onClick: onRequestMagicLink },
    { id: 'forgot', label: 'Forgot password?', detail: 'Reset password via email', sends: forgotSends, max: getMaxSends('otp'), disabled: !canForgot, cooldownRemaining: forgotCooldownRemaining, resetsAt: getResetAt('otp'), onClick: onRequestForgotPassword },
  ];

  if (loginProfile?.hasRecoveryEmail) {
    options.push({
      id: 'recovery',
      label: 'Recovery email',
      detail: `Code to ${loginProfile.recoveryEmail || 'backup email'}`,
      sends: recoverySends,
      max: getMaxSends('recovery'),
      disabled: !canRecovery,
      cooldownRemaining: recoveryCooldownRemaining,
      resetsAt: getResetAt('recovery'),
      onClick: onRequestRecoveryEmail,
    });
  }

  return (
    <div className="login-more-options auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%' }}>
      {/* Header — Google Sans 28 */}
      <div style={{ textAlign: 'center', marginBottom: '16px', animation: 'moFadeUp 0.35s ease both' }}>
        {photoUrl ? (
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            overflow: 'hidden',
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
          }}>
            <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '16px',
            background: 'rgba(0,149,246,0.08)',
            border: '1px solid rgba(0,149,246,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#7DD3FC', fontFamily: TYPOGRAPHY.fontFamily }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h2 style={{ fontFamily: "'Google Sans', sans-serif", fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', color: '#FAFAFA', margin: '0 0 8px', lineHeight: 1 }}>
          More ways to <span style={{ fontWeight: 700, color: '#0095F6' }}>sign in</span>
        </h2>
        <p style={{ fontSize: '13px', color: '#71717A', fontFamily: TYPOGRAPHY.fontFamily, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '999px', padding: '6px 12px', display: 'inline-block', margin: 0 }}>
          {email}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {options.map((opt, i) => (
          <OptionRow key={opt.id} option={opt} index={i} isLast={i === options.length - 1} />
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '16px 0 12px',
        animation: `moFadeUp 0.35s ease ${0.15 + options.length * 0.06}s both`,
      }}>
        <div style={{ flex: 1, height: '1px', background: '#141416' }} />
        <div style={{ flex: 1, height: '1px', background: '#141416' }} />
      </div>

      <button
        type="button"
        onClick={onBack}
        style={{
          ...secondaryBtn,
          animation: `moFadeUp 0.35s ease ${0.15 + options.length * 0.06 + 0.06}s both`,
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#FAFAFA'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#A1A1AA'; }}
      >
        Back to sign in
      </button>
    </div>
  );
};

LoginMoreOptions.displayName = 'LoginMoreOptions';

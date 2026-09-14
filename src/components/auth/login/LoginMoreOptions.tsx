'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface LoginMoreOptionsProps {
  email: string;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  isSubmitting: boolean;
  canSend: (method: string) => boolean;
  remainingSends: (method: string) => number;
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
  height: '44px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#A1A1AA',
  fontSize: '14px',
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
  disabled: boolean;
  cooldownRemaining: number;
  onClick: () => void;
};

const OptionRow = ({ option, index, isLast }: { option: OptionConfig; index: number; isLast: boolean }) => {
  const [hovered, setHovered] = React.useState(false);
  const delay = 0.08 + index * 0.06;
  const sends = Number(option.sends) || 0;
  const cooldown = Number(option.cooldownRemaining) || 0;

  return (
    <button
      type="button"
      onClick={option.onClick}
      disabled={option.disabled}
      className="login-more-option"
      style={{
        width: '100%',
        padding: '16px 18px',
        background: hovered && !option.disabled ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderBottom: isLast ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        color: 'inherit',
        font: 'inherit',
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        opacity: option.disabled ? 0.35 : 1,
        transition: 'all 150ms ease',
        boxSizing: 'border-box',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: isLast ? 0 : '12px',
        animation: `moFadeUp 0.35s ease ${delay}s both`,
        boxShadow: hovered && !option.disabled ? '0 0 0 1px rgba(56,189,248,0.14), 0 4px 16px rgba(56,189,248,0.06)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: hovered && !option.disabled ? '#E0F2FE' : '#FAFAFA',
            fontFamily: TYPOGRAPHY.fontFamily,
            transition: 'color 150ms ease',
          }}>
            {option.label}
          </span>
          {sends >= 0 && (
            <span style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '999px',
              background: sends === 0 ? 'rgba(244,63,94,0.10)' : cooldown > 0 ? 'rgba(56,189,248,0.10)' : 'rgba(255,255,255,0.06)',
              color: sends === 0 ? '#f43f5e' : cooldown > 0 ? '#38BDF8' : '#A1A1AA',
              border: `1px solid ${sends === 0 ? 'rgba(244,63,94,0.18)' : cooldown > 0 ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.07)'}`,
              letterSpacing: '0.02em',
            }}>
              {sends === 0 ? 'limit reached' : cooldown > 0 ? `${cooldown}s` : `${sends} left`}
            </span>
          )}
        </div>
        <p style={{
          fontSize: '13px',
          color: hovered && !option.disabled ? '#7DD3FC' : '#71717A',
          margin: '6px 0 0',
          fontFamily: TYPOGRAPHY.fontFamily,
          transition: 'color 150ms ease',
          lineHeight: 1.5,
        }}>
          {option.disabled && sends === 0
            ? 'Maximum attempts reached for this session'
            : cooldown > 0
              ? `Wait ${cooldown}s before sending again`
              : option.detail}
        </p>
      </div>

      <span style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '999px', background: hovered && !option.disabled ? '#0095F6' : 'rgba(255,255,255,0.06)', border: `1px solid ${hovered && !option.disabled ? '#0095F6' : 'rgba(255,255,255,0.07)'}`, display: 'grid', placeItems: 'center', transition: 'all 150ms ease', transform: hovered && !option.disabled ? 'translateX(2px)' : 'none' }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={hovered && !option.disabled ? '#FFFFFF' : '#71717A'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition: 'stroke 150ms ease' }}
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  );
};

export const LoginMoreOptions: React.FC<LoginMoreOptionsProps> = ({
  email, loginProfile, isSubmitting, canSend, remainingSends, isInCooldown, getCooldownRemaining,
  onRequestCode, onRequestMagicLink, onRequestForgotPassword, onRequestRecoveryEmail, onBack,
}) => {
  ensureStyles();

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
    { id: 'code', label: 'One-time code', detail: '6-digit code sent to your inbox', sends: codeSends, disabled: !canCode, cooldownRemaining: codeCooldownRemaining, onClick: onRequestCode },
    { id: 'magic', label: 'Magic link', detail: 'Sign-in link sent to your email', sends: magicLinkSends, disabled: !canMagic, cooldownRemaining: magicCooldownRemaining, onClick: onRequestMagicLink },
    { id: 'forgot', label: 'Forgot password?', detail: 'Reset password via email', sends: forgotSends, disabled: !canForgot, cooldownRemaining: forgotCooldownRemaining, onClick: onRequestForgotPassword },
  ];

  if (loginProfile?.hasRecoveryEmail) {
    options.push({
      id: 'recovery',
      label: 'Recovery email',
      detail: `Code to ${loginProfile.recoveryEmail || 'backup email'}`,
      sends: recoverySends,
      disabled: !canRecovery,
      cooldownRemaining: recoveryCooldownRemaining,
      onClick: onRequestRecoveryEmail,
    });
  }

  return (
    <div className="login-more-options auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%' }}>
      {/* Header with profile pic — Instrument Serif 30px */}
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
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.14)',
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
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', fontWeight: 400, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '0 0 8px', lineHeight: 1.1 }}>
          More ways to <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#38BDF8' }}>sign in</em>
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

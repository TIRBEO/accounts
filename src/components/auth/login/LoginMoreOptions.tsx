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
  height: '48px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '14px',
  color: '#A1A1AA',
  fontSize: '15px',
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
        padding: '18px 20px',
        background: hovered && !option.disabled ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid #141416',
        borderRadius: '0',
        color: 'inherit',
        font: 'inherit',
        cursor: option.disabled ? 'not-allowed' : 'pointer',
        opacity: option.disabled ? 0.3 : 1,
        transition: 'all 120ms ease',
        boxSizing: 'border-box',
        textAlign: 'left',
        animation: `moFadeUp 0.35s ease ${delay}s both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#FAFAFA',
            fontFamily: TYPOGRAPHY.fontFamily,
            transition: 'color 120ms ease',
          }}>
            {option.label}
          </span>
          {sends >= 0 && (
            <span style={{
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              background: sends === 0 ? 'rgba(244,63,94,0.1)' : '#141416',
              color: sends === 0 ? '#f43f5e' : '#A1A1AA',
              border: `1px solid ${sends === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
              letterSpacing: '0.02em',
            }}>
              {sends === 0 ? 'limit reached' : cooldown > 0 ? `${cooldown}s` : `${sends} left`}
            </span>
          )}
        </div>
        <p style={{
          fontSize: '13px',
          color: '#71717A',
          margin: '4px 0 0',
          fontFamily: TYPOGRAPHY.fontFamily,
          transition: 'color 120ms ease',
          ...(hovered && !option.disabled ? { color: '#A1A1AA' } : {}),
        }}>
          {option.disabled && sends === 0
            ? 'Maximum attempts reached for this session'
            : cooldown > 0
              ? `Wait ${cooldown}s before sending again`
              : option.detail}
        </p>
      </div>

      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={hovered && !option.disabled ? '#A1A1AA' : '#484848'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, marginLeft: '16px', transition: 'all 120ms ease', transform: hovered && !option.disabled ? 'translateX(2px)' : 'none' }}
      >
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
      </svg>
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
      {/* Header with profile pic */}
      <div style={{ textAlign: 'center', marginBottom: '32px', animation: 'moFadeUp 0.35s ease both' }}>
        {photoUrl ? (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '2px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            overflow: 'hidden',
          }}>
            <img src={photoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '2px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#484848', fontFamily: TYPOGRAPHY.fontFamily }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#FAFAFA', marginBottom: '8px', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '1.2' }}>
          More ways to sign in
        </h2>
        <p style={{ fontSize: '14px', color: '#71717A', fontFamily: TYPOGRAPHY.fontFamily }}>
          {email}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {options.map((opt, i) => (
          <OptionRow key={opt.id} option={opt} index={i} isLast={i === options.length - 1} />
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        margin: '28px 0 24px',
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

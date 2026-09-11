'use client';

import React, { useState } from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface LoginRecoveryProps {
  email: string;
  loginProfile: { email: string; exists: boolean; photoUrl?: string | null; name?: string | null; hasRecoveryEmail?: boolean; recoveryEmail?: string | null } | null;
  recoveryMethod: 'code' | 'magic-link' | 'recovery' | null;
  recoveryStage: 'code' | 'password';
  recoveryCode: string;
  setRecoveryCode: (value: string) => void;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => void;
  onBack: () => void;
  onSubmitCode: (code: string) => void;
  onSubmitNewPassword: (password: string) => void;
  remainingSends: (method: string) => number;
}

const codeInput: React.CSSProperties = {
  width: '52px',
  height: '60px',
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '28px',
  fontWeight: 700,
  fontFamily: "'SF Mono',ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
  textAlign: 'center',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  caretColor: 'transparent',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '56px',
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  color: '#f5f5f5',
  fontSize: '16px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 24px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: '56px',
  background: '#0095f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '14px',
  fontSize: '17px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'opacity 150ms ease',
};

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  height: '48px',
  background: '#111111',
  border: '1px solid #2a2a2a',
  borderRadius: '14px',
  color: '#a0a0a0',
  fontSize: '15px',
  fontWeight: 600,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
};

export const LoginRecovery: React.FC<LoginRecoveryProps> = ({
  email, loginProfile, recoveryMethod, recoveryStage, recoveryCode, setRecoveryCode,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onBack,
  onSubmitCode, onSubmitNewPassword, remainingSends,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const methodLabel = recoveryMethod === 'magic-link' ? 'magic link' : 'reset code';
  const codeLength = 6;
  const cooldownKey = recoveryMethod === 'magic-link' ? 'magic-link' : recoveryMethod === 'recovery' ? 'recovery' : 'otp';
  const sendsRemaining = remainingSends(cooldownKey);

  if (recoveryStage === 'password') {
    const canSubmit = newPassword.length >= 8 && confirmPassword === newPassword && !isSubmitting;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f5f5f5', marginBottom: '12px', fontFamily: TYPOGRAPHY.fontFamily }}>
            Create new password
          </h2>
          <p style={{ fontSize: '15px', color: '#707070', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px' }}>
            Choose a strong password for <span style={{ color: '#a0a0a0' }}>{email}</span>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password" autoComplete="new-password"
              style={inputBase}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3a3a3a'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#707070', cursor: 'pointer',
                padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
          <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password" autoComplete="new-password"
            style={inputBase}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3a3a3a'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p style={{ fontSize: '14px', color: '#ed4956', marginTop: '-4px' }}>Passwords don&apos;t match</p>
          )}
        </div>

        <button type="button" onClick={() => onSubmitNewPassword(newPassword)} disabled={!canSubmit}
          style={{
            ...primaryBtn,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" /></svg>
              Saving...
            </span>
          ) : 'Save new password'}
        </button>

        <button type="button" onClick={onBack} style={secondaryBtn}
          onMouseOver={e => { e.currentTarget.style.background = '#161616'; e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#f5f5f5'; }}
          onMouseOut={e => { e.currentTarget.style.background = '#111111'; e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a0a0a0'; }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#f5f5f5', marginBottom: '12px', fontFamily: TYPOGRAPHY.fontFamily }}>
          {recoveryMethod === 'magic-link' ? 'Check your email' : 'Enter verification code'}
        </h2>
        <p style={{ fontSize: '15px', color: '#707070', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px' }}>
          {recoveryMethod === 'magic-link'
            ? <>We sent a magic link to <span style={{ color: '#a0a0a0' }}>{email}</span>.</>
            : recoveryMethod === 'recovery'
              ? <>We sent a code to <span style={{ color: '#a0a0a0' }}>{loginProfile?.recoveryEmail || 'your recovery email'}</span>.</>
              : <>We sent a code to <span style={{ color: '#a0a0a0' }}>{email}</span>.</>
          }
        </p>
      </div>

      {recoveryMethod !== 'magic-link' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {[...Array(codeLength)].map((_, i) => (
              <input key={i} type="text" inputMode="numeric" maxLength={1} value={recoveryCode[i] || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  const nextCode = recoveryCode.split('');
                  nextCode[i] = value;
                  setRecoveryCode(nextCode.join(''));
                  if (i < codeLength - 1 && value) (document.querySelector(`input[data-recovery-index="${i + 1}"]`) as HTMLInputElement | null)?.focus();
                  else if (i > 0 && !value) (document.querySelector(`input[data-recovery-index="${i - 1}"]`) as HTMLInputElement | null)?.focus();
                }}
                onKeyDown={(e) => { if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) (document.querySelector(`input[data-recovery-index="${i - 1}"]`) as HTMLInputElement | null)?.focus(); }}
                onPaste={(e) => { e.preventDefault(); const p = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, codeLength); if (p.length === codeLength) setRecoveryCode(p); }}
                style={{
                  ...codeInput,
                  borderColor: recoveryCode[i] ? '#3a3a3a' : '#2a2a2a',
                }}
                data-recovery-index={i}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0095f6'; }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = recoveryCode[i] ? '#3a3a3a' : '#2a2a2a';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            {isInCooldown(cooldownKey) ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#707070', fontSize: '14px', fontFamily: TYPOGRAPHY.fontFamily }}>
                <span>Resend in {getCooldownRemaining(cooldownKey)}s</span>
                <span style={{
                  padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                  background: sendsRemaining === 0 ? 'rgba(237,73,86,0.1)' : '#1a1a1a',
                  color: sendsRemaining === 0 ? '#ed4956' : '#a0a0a0',
                  border: `1px solid ${sendsRemaining === 0 ? 'rgba(237,73,86,0.2)' : '#2a2a2a'}`,
                }}>
                  {sendsRemaining === 0 ? 'limit reached' : `${sendsRemaining} left`}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <button type="button" onClick={onResend}
                  style={{
                    background: 'none', border: 'none', color: '#707070', fontSize: '14px',
                    fontFamily: TYPOGRAPHY.fontFamily, cursor: 'pointer', padding: 0,
                    transition: 'color 150ms ease',
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = '#a0a0a0'; }}
                  onMouseOut={e => { e.currentTarget.style.color = '#707070'; }}
                >
                  Resend {methodLabel}
                </button>
                <span style={{
                  padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
                  background: sendsRemaining === 0 ? 'rgba(237,73,86,0.1)' : '#1a1a1a',
                  color: sendsRemaining === 0 ? '#ed4956' : '#a0a0a0',
                  border: `1px solid ${sendsRemaining === 0 ? 'rgba(237,73,86,0.2)' : '#2a2a2a'}`,
                }}>
                  {sendsRemaining === 0 ? 'limit reached' : `${sendsRemaining} left`}
                </span>
              </div>
            )}
          </div>

          <button type="button" onClick={() => onSubmitCode(recoveryCode)} disabled={recoveryCode.length !== codeLength || isSubmitting}
            style={{
              ...primaryBtn,
              opacity: recoveryCode.length === codeLength && !isSubmitting ? 1 : 0.5,
              cursor: recoveryCode.length === codeLength && !isSubmitting ? 'pointer' : 'not-allowed',
            }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" /></svg>
                Verifying...
              </span>
            ) : 'Verify & Continue'}
          </button>
        </>
      )}

      {recoveryMethod === 'magic-link' && (
        <div style={{ textAlign: 'center' }}>
          {isInCooldown(cooldownKey) ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#707070', fontSize: '14px', fontFamily: TYPOGRAPHY.fontFamily }}>
              <span>Resend in {getCooldownRemaining(cooldownKey)}s</span>
            </div>
          ) : (
            <button type="button" onClick={onResend}
              style={{
                background: 'none', border: 'none', color: '#707070', fontSize: '14px',
                fontFamily: TYPOGRAPHY.fontFamily, cursor: 'pointer', padding: 0,
                transition: 'color 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#a0a0a0'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#707070'; }}
            >
              Resend magic link
            </button>
          )}
        </div>
      )}

      <button type="button" onClick={onBack} style={secondaryBtn}
        onMouseOver={e => { e.currentTarget.style.background = '#161616'; e.currentTarget.style.borderColor = '#3a3a3a'; e.currentTarget.style.color = '#f5f5f5'; }}
        onMouseOut={e => { e.currentTarget.style.background = '#111111'; e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a0a0a0'; }}
      >
        Back to sign in
      </button>
    </div>
  );
};

LoginRecovery.displayName = 'LoginRecovery';

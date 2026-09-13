'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';
import type { LoginStep } from '../../../lib/validations';

interface Login2FAProps {
  twoFactorCode: string;
  setTwoFactorCode: (v: string) => void;
  backupCode: string;
  setBackupCode: (v: string) => void;
  loginWithBackup: boolean;
  setLoginWithBackup: (v: boolean) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  setRecoveryMethod: (method: 'code' | 'magic-link' | 'recovery' | null) => void;
  setLoginStep: (step: LoginStep) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const codeInput: React.CSSProperties = {
  width: '52px',
  height: '60px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '14px',
  color: '#FAFAFA',
  fontSize: '28px',
  fontWeight: 700,
  fontFamily: "'SF Mono',ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
  textAlign: 'center',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  caretColor: 'transparent',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '12px',
  fontSize: '15px',
  fontWeight: 600,
  color: active ? '#FAFAFA' : '#71717A',
  background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'background 150ms ease, color 150ms ease',
  fontFamily: TYPOGRAPHY.fontFamily,
});

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: '44px',
  background: '#0095F6',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontSize: '17px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  boxShadow: 'none',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  height: '56px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '14px',
  color: '#FAFAFA',
  fontSize: '16px',
  fontFamily: TYPOGRAPHY.fontFamily,
  padding: '0 24px',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
};

export const Login2FA: React.FC<Login2FAProps> = ({
  twoFactorCode, setTwoFactorCode, backupCode, setBackupCode,
  loginWithBackup, setLoginWithBackup, errors, touched, handleBlur,
  isSubmitting, onSubmit,
}) => {
  const showCodeError = touched.twoFactorCode && errors.twoFactorCode;
  const showBackupError = touched.backupCode && errors.backupCode;

  return (
    <form
      className="auth-form"
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#FAFAFA', marginBottom: '12px', fontFamily: TYPOGRAPHY.fontFamily }}>
          Two-factor authentication
        </h2>
        <p style={{ fontSize: '15px', color: '#71717A', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px' }}>
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '4px',
        background: '#141416',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '4px',
      }}>
        <button type="button" onClick={() => { setLoginWithBackup(false); setTwoFactorCode(''); }}
          style={tabStyle(!loginWithBackup)}
        >
          Authenticator
        </button>
        <button type="button" onClick={() => { setLoginWithBackup(true); setBackupCode(''); }}
          style={tabStyle(loginWithBackup)}
        >
          Backup Code
        </button>
      </div>

      {!loginWithBackup && (
        <div className="otp-grid" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          {[...Array(6)].map((_, i) => (
            <input key={i} type="text" maxLength={1} value={twoFactorCode[i] || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                const nextCode = Array.from({ length: 6 }, (_, j) => twoFactorCode[j] || '');
                nextCode[i] = value;
                setTwoFactorCode(nextCode.join(''));
                if (i < 5 && value) (document.querySelector(`input[data-2fa-index="${i + 1}"]`) as HTMLInputElement | null)?.focus();
                else if (i > 0 && !value) (document.querySelector(`input[data-2fa-index="${i - 1}"]`) as HTMLInputElement | null)?.focus();
              }}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) (document.querySelector(`input[data-2fa-index="${i - 1}"]`) as HTMLInputElement | null)?.focus(); }}
              onPaste={(e) => { e.preventDefault(); const p = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6); if (p.length === 6) setTwoFactorCode(p); }}
              style={{
                ...codeInput,
                borderColor: showCodeError ? '#f43f5e' : twoFactorCode[i] ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)',
              }}
              data-2fa-index={i}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#FFFFFF'; }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = showCodeError ? '#f43f5e' : twoFactorCode[i] ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          ))}
        </div>
      )}

      {!loginWithBackup && showCodeError && (
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#f43f5e', marginTop: '-12px' }}>{errors.twoFactorCode}</p>
      )}

      {loginWithBackup && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="text" value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onBlur={() => handleBlur('backupCode')} placeholder="Backup code" maxLength={8}
            style={{
              ...inputBase,
              borderColor: showBackupError ? '#f43f5e' : 'rgba(255,255,255,0.07)',
              fontFamily: "'SF Mono',ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
            onFocus={(e) => { if (!showBackupError) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = showBackupError ? '#f43f5e' : 'rgba(255,255,255,0.07)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {showBackupError && (
            <p style={{ fontSize: '14px', color: '#f43f5e', margin: 0 }}>{errors.backupCode}</p>
          )}
          <p style={{ fontSize: '13px', color: '#71717A', margin: 0 }}>Enter one of your 8-character backup codes.</p>
        </div>
      )}

      <button type="submit"
        disabled={(!loginWithBackup && twoFactorCode.length !== 6) || (loginWithBackup && !backupCode) || isSubmitting}
        style={{
          ...primaryBtn,
          background: ((loginWithBackup ? !!backupCode : twoFactorCode.length === 6) && !isSubmitting) ? '#0095F6' : 'rgba(255,255,255,0.08)',
          color: ((loginWithBackup ? !!backupCode : twoFactorCode.length === 6) && !isSubmitting) ? '#FFFFFF' : '#71717A',
          opacity: 1,
          cursor: ((loginWithBackup ? !!backupCode : twoFactorCode.length === 6) && !isSubmitting) ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
            </svg>
            Verifying...
          </span>
        ) : 'Verify'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        {!loginWithBackup && (
          <button type="button" onClick={() => setLoginWithBackup(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#71717A',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: TYPOGRAPHY.fontFamily,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'color 150ms ease, background 150ms ease',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#71717A'; e.currentTarget.style.background = 'transparent'; }}
          >
            Use recovery code instead
          </button>
        )}
        <button type="button" onClick={() => window.history.back()}
          style={{
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
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#FAFAFA'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#A1A1AA'; }}
        >
          Back
        </button>
      </div>
    </form>
  );
};

Login2FA.displayName = 'Login2FA';

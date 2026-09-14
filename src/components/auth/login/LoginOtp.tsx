'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface LoginOtpProps {
  email: string;
  loginOtpCode: string;
  setLoginOtpCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  loginPending2fa: boolean;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  remainingSends: (method: string) => number;
}

const codeInput: React.CSSProperties = {
  width: '48px',
  height: '52px',
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '12px',
  color: '#FAFAFA',
  fontSize: '20px',
  fontWeight: 700,
  fontFamily: "'SF Mono',ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace",
  textAlign: 'center',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  caretColor: '#38BDF8',
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: '44px',
  background: '#0095F6',
  color: '#FFFFFF',
  border: '1px solid #0095F6',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  boxShadow: '0 4px 16px rgba(0,149,246,0.28)',
};

export const LoginOtp: React.FC<LoginOtpProps> = ({
  email, loginOtpCode, setLoginOtpCode, errors, touched, handleBlur,
  loginPending2fa, isSubmitting, isInCooldown, getCooldownRemaining,
  onResend, onSubmit, remainingSends,
}) => {
  const showCodeError = touched.loginOtpCode && errors.loginOtpCode;
  const codeComplete = loginOtpCode.length === 6;
  const sendsRemaining = remainingSends('login-otp');

  return (
    <form className="auth-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '22px', fontWeight: 400, letterSpacing: '-0.03em', color: '#FAFAFA', margin: '0 0 10px', lineHeight: 1.1 }}>
          Check your <em style={{ fontStyle: 'italic', fontWeight: 400, color: '#38BDF8' }}>email</em>
        </h2>
        <p style={{ fontSize: '14.5px', color: '#A1A1AA', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px', margin: 0 }}>
          We sent a 6-digit code to <span style={{ color: '#FAFAFA', fontWeight: 600 }}>{email}</span>.
        </p>
        {loginPending2fa && (
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#484848' }}>
            After verifying, you&apos;ll need your 2FA code.
          </p>
        )}
      </div>

      <div className="otp-grid" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {[...Array(6)].map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={loginOtpCode[i] || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              const nextCode = loginOtpCode.split('');
              nextCode[i] = value;
              setLoginOtpCode(nextCode.join(''));
              if (i < 5 && value) {
                (document.querySelector(`input[data-code-index="${i + 1}"]`) as HTMLInputElement | null)?.focus();
              } else if (i > 0 && !value) {
                (document.querySelector(`input[data-code-index="${i - 1}"]`) as HTMLInputElement | null)?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
                (document.querySelector(`input[data-code-index="${i - 1}"]`) as HTMLInputElement | null)?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
              if (pasted.length === 6) setLoginOtpCode(pasted);
            }}
            style={{
              ...codeInput,
              borderColor: showCodeError ? '#f43f5e' : loginOtpCode[i] ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.07)',
              boxShadow: loginOtpCode[i] && !showCodeError ? '0 0 0 3px rgba(56,189,248,0.08)' : 'none',
            }}
            data-code-index={i}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#38BDF8'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(56,189,248,0.14)'; }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = showCodeError ? '#f43f5e' : loginOtpCode[i] ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.07)';
              e.currentTarget.style.boxShadow = loginOtpCode[i] && !showCodeError ? '0 0 0 3px rgba(56,189,248,0.08)' : 'none';
            }}
          />
        ))}
      </div>

      <input type="hidden" value={loginOtpCode} onChange={(e) => setLoginOtpCode(e.target.value)} onBlur={() => handleBlur('loginOtpCode')} />

      {showCodeError && (
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#f43f5e', marginTop: '-12px' }}>{errors.loginOtpCode}</p>
      )}

      <div style={{ textAlign: 'center' }}>
        {isInCooldown('login-otp') ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#71717A', fontSize: '14px', fontFamily: TYPOGRAPHY.fontFamily }}>
            <span>Resend in {getCooldownRemaining('login-otp')}s</span>
            <span style={{
              padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
              background: sendsRemaining === 0 ? 'rgba(244,63,94,0.1)' : '#141416',
              color: sendsRemaining === 0 ? '#f43f5e' : '#A1A1AA',
              border: `1px solid ${sendsRemaining === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {sendsRemaining === 0 ? 'limit reached' : `${sendsRemaining} left`}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button type="button" onClick={onResend}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717A',
                fontSize: '14px',
                fontFamily: TYPOGRAPHY.fontFamily,
                cursor: 'pointer',
                padding: 0,
                transition: 'color 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#A1A1AA'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#71717A'; }}
            >
              Resend code
            </button>
            <span style={{
              padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
              background: sendsRemaining === 0 ? 'rgba(244,63,94,0.1)' : '#141416',
              color: sendsRemaining === 0 ? '#f43f5e' : '#A1A1AA',
              border: `1px solid ${sendsRemaining === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {sendsRemaining === 0 ? 'limit reached' : `${sendsRemaining} left`}
            </span>
          </div>
        )}
      </div>

      <button type="submit" disabled={!codeComplete || isSubmitting}
        style={{
          ...primaryBtn,
          background: codeComplete && !isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.08)',
          color: codeComplete && !isSubmitting ? '#FFFFFF' : '#71717A',
          opacity: 1,
          cursor: codeComplete && !isSubmitting ? 'pointer' : 'not-allowed',
          boxShadow: codeComplete && !isSubmitting ? '0 4px 16px rgba(0,149,246,0.28)' : 'none',
          border: `1px solid ${codeComplete && !isSubmitting ? '#0095F6' : 'rgba(255,255,255,0.06)'}`,
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

      <button type="button" onClick={() => window.history.back()}
        style={{
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
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#FAFAFA'; }}
        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#A1A1AA'; }}
      >
        Back to sign in
      </button>
    </form>
  );
};

LoginOtp.displayName = 'LoginOtp';

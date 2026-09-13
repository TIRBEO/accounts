'use client';

import React from 'react';
import { TYPOGRAPHY } from '../../../lib/design';

interface SignupStep3Props {
  email: string;
  verificationCode: string;
  setVerificationCode: (v: string) => void;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  handleBlur: (field: string) => void;
  isSubmitting: boolean;
  isInCooldown: (key: string) => boolean;
  getCooldownRemaining: (key: string) => number;
  onResend: () => void;
  onSubmit: (e: React.FormEvent) => void;
  remainingSends: (method: string) => number;
}

const codeInputStyle: React.CSSProperties = {
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

const gradientBtn = (enabled: boolean): React.CSSProperties => ({
  width: '100%',
  height: '44px',
  background: enabled ? '#0095F6' : 'rgba(255,255,255,0.08)',
  color: enabled ? '#FFFFFF' : '#71717A',
  border: 'none',
  borderRadius: '8px',
  fontSize: '17px',
  fontWeight: 700,
  fontFamily: TYPOGRAPHY.fontFamily,
  cursor: enabled ? 'pointer' : 'not-allowed',
  transition: 'all 150ms ease',
  opacity: 1,
  boxShadow: 'none',
});

export const SignupStep3: React.FC<SignupStep3Props> = ({
  email, verificationCode, setVerificationCode, errors, touched, handleBlur,
  isSubmitting, isInCooldown, getCooldownRemaining, onResend, onSubmit, remainingSends,
}) => {
  const showCodeError = touched.verificationCode && errors.verificationCode;
  const codeComplete = verificationCode.length === 6;

  return (
    <form
      className="auth-form"
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#FAFAFA', marginBottom: '12px', fontFamily: TYPOGRAPHY.fontFamily }}>
          Verify your email
        </h2>
        <p style={{ fontSize: '15px', color: '#71717A', fontFamily: TYPOGRAPHY.fontFamily, lineHeight: '22px' }}>
          We sent a code to <span style={{ color: '#A1A1AA' }}>{email}</span>.
        </p>
      </div>

      <div className="otp-grid" style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        {[...Array(6)].map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={verificationCode[i] || ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              const nextCode = verificationCode.split('');
              nextCode[i] = value;
              setVerificationCode(nextCode.join(''));
              if (i < 5 && value) {
                const nextInput = document.querySelector(`input[data-code-index="${i + 1}"]`) as HTMLInputElement | null;
                nextInput?.focus();
              } else if (i > 0 && !value) {
                const prevInput = document.querySelector(`input[data-code-index="${i - 1}"]`) as HTMLInputElement | null;
                prevInput?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
                const prevInput = document.querySelector(`input[data-code-index="${i - 1}"]`) as HTMLInputElement | null;
                prevInput?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
              if (pasted.length === 6) {
                setVerificationCode(pasted);
              }
            }}
            style={{
              ...codeInputStyle,
              borderColor: showCodeError ? '#f43f5e' : verificationCode[i] ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)',
            }}
            data-code-index={i}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FFFFFF';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = showCodeError ? '#f43f5e' : verificationCode[i] ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.07)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        ))}
      </div>

      <input type="hidden" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} onBlur={() => handleBlur('verificationCode')} />

      {showCodeError && (
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#f43f5e', marginTop: '-12px' }}>{errors.verificationCode}</p>
      )}

      <div style={{ textAlign: 'center' }}>
        {isInCooldown('signup-otp') ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#71717A', fontSize: '14px', fontFamily: TYPOGRAPHY.fontFamily }}>
            <span>Resend in {getCooldownRemaining('signup-otp')}s</span>
            <span style={{
              padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
              background: remainingSends('signup-otp') === 0 ? 'rgba(244,63,94,0.1)' : '#141416',
              color: remainingSends('signup-otp') === 0 ? '#f43f5e' : '#A1A1AA',
              border: `1px solid ${remainingSends('signup-otp') === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {remainingSends('signup-otp') === 0 ? 'limit reached' : `${remainingSends('signup-otp')} left`}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <button type="button" onClick={onResend}
              style={{
                background: 'none', border: 'none', color: '#71717A', fontSize: '14px',
                fontFamily: TYPOGRAPHY.fontFamily, cursor: 'pointer', padding: 0,
                transition: 'color 150ms ease',
              }}
              onMouseOver={e => { e.currentTarget.style.color = '#A1A1AA'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#71717A'; }}
            >
              Resend code
            </button>
            <span style={{
              padding: '2px 7px', fontSize: '11px', fontWeight: 600, borderRadius: '4px',
              background: remainingSends('signup-otp') === 0 ? 'rgba(244,63,94,0.1)' : '#141416',
              color: remainingSends('signup-otp') === 0 ? '#f43f5e' : '#A1A1AA',
              border: `1px solid ${remainingSends('signup-otp') === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
            }}>
              {remainingSends('signup-otp') === 0 ? 'limit reached' : `${remainingSends('signup-otp')} left`}
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>
        <button
          type="submit"
          disabled={!codeComplete || isSubmitting}
          style={gradientBtn(codeComplete && !isSubmitting)}
        >
          {isSubmitting ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="30 70" />
              </svg>
              Verifying...
            </span>
          ) : 'Verify & Continue'}
        </button>
      </div>
    </form>
  );
};

SignupStep3.displayName = 'SignupStep3';
